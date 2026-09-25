import { BadRequestException } from '@nestjs/common';

export type BookingStatusType =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'NO_SHOW'
  | 'CANCELLED';

export class BookingStateMachine {
  private static readonly allowedTransitions: Record<
    BookingStatusType,
    BookingStatusType[]
  > = {
    PENDING_PAYMENT: ['CONFIRMED', 'EXPIRED', 'CANCELLED'],
    CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
    CHECKED_IN: ['COMPLETED'],
    COMPLETED: [],
    EXPIRED: ['CONFIRMED'], // Re-confirm if slot free on late webhook
    NO_SHOW: [],
    CANCELLED: [],
  };

  static validateTransition(
    currentStatus: BookingStatusType,
    targetStatus: BookingStatusType,
  ): void {
    const allowed = this.allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Illegal booking status transition from ${currentStatus} to ${targetStatus}`,
      );
    }
  }

  static isTransitionAllowed(
    currentStatus: BookingStatusType,
    targetStatus: BookingStatusType,
  ): boolean {
    const allowed = this.allowedTransitions[currentStatus] || [];
    return allowed.includes(targetStatus);
  }
}
