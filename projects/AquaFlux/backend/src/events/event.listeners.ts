import { container } from 'tsyringe';
import { EventEmitter } from 'events';
import { pino } from 'pino';
import { EventConstants } from './event.constants';

export function setupPaymentEventListeners() {
  const eventEmitter = container.resolve<EventEmitter>('EventEmitter');
  const logger = container.resolve<pino.Logger>('Logger');

  eventEmitter.on(EventConstants.PAYMENT_COMPLETED, async () => {
    logger.info('PAYMENT_COMPLETED event received. Crediting user balance.');
  });

  // You can add more event listeners here for other events
}
