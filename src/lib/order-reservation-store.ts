import { Prisma, type PrismaClient } from '@prisma/client';
import { isExpiredUnpaidOrder, ReservationInventoryError, type CleanupDependencies } from './order-reservations';

type ReservationToRelease = { id: string; variantId: string; quantity: number; status: string };

/** Caller holds the order and sorted variant locks in this same transaction. */
export async function releaseLockedReservations(
  tx: Prisma.TransactionClient, reservations: ReservationToRelease[], now: Date,
) {
  for (const reservation of reservations.filter((item) => item.status === 'RESERVED')) {
    const updated = await tx.productVariant.updateMany({
      where: { id: reservation.variantId, reservedStock: { gte: reservation.quantity } },
      data: { reservedStock: { decrement: reservation.quantity } },
    });
    if (updated.count !== 1) throw new ReservationInventoryError();
    await tx.inventoryReservation.update({
      where: { id: reservation.id }, data: { status: 'RELEASED', releasedAt: now },
    });
  }
}

/** Keep the production adapter injectable so tests exercise the transaction
 * boundary, query guards and lock order, rather than mocking the whole release. */
export function createReservationCleanupDependencies(
  db: Pick<PrismaClient, '$transaction'>, now: () => number = Date.now,
): CleanupDependencies {
  return {
    now,
    candidates: (take, before, options) => db.$transaction((tx) => tx.order.findMany({
      where: { paymentStatus: 'PENDING', stockCommittedAt: null, reservationExpiresAt: { lt: before } },
      select: { id: true }, take,
      orderBy: [{ reservationExpiresAt: 'asc' }, { id: 'asc' }],
    }), options),
    release: (id, before, options) => db.$transaction(async (tx) => {
      // Share order -> sorted variants with checkout/payment/admin mutations.
      // Nonblocking locks let a payment win instead of waiting behind cleanup.
      const tryLock = async (key: string) => {
        const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${key})) AS locked`;
        return rows[0]?.locked === true;
      };
      if (!await tryLock(`order/${id}`)) return 'skipped';
      // No customer details, products or notification payloads are needed here.
      const order = await tx.order.findUnique({
        where: { id },
        select: {
          paymentStatus: true, stockCommittedAt: true, reservationExpiresAt: true,
          reservations: { select: { id: true, variantId: true, quantity: true, status: true } },
        },
      });
      if (!isExpiredUnpaidOrder(order, before)) return 'skipped';
      const reservations = order!.reservations;
      const variants = [...new Set(reservations.filter((item) => item.status === 'RESERVED').map((item) => item.variantId))].sort();
      for (const variantId of variants) {
        if (!await tryLock(`inventory/${variantId}`)) return 'skipped';
      }
      // Locks are already held: do not acquire them again for every release.
      await releaseLockedReservations(tx, reservations, before);
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED', paymentStatus: 'EXPIRED', fulfillmentStatus: 'CANCELLED',
          reservationExpiresAt: null, cancelledAt: before,
          cancellationReason: 'Payment window expired before a captured payment was confirmed.',
        },
      });
      await tx.orderEvent.create({ data: {
        orderId: id, type: 'RESERVATION_EXPIRED',
        message: 'Unpaid checkout hold expired and inventory was released.', data: {},
      } });
      return 'released';
    }, { ...options, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
  };
}
