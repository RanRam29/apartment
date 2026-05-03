const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

const kafka = new Kafka({
  clientId: 'apartment-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
  retry: { initialRetryTime: 300, retries: 5 },
});

let producer;
let consumer;

const TOPICS = {
  SWIPE_EVENT: 'swipe-events',
  MATCH_EVENT: 'match-events',
  NOTIFICATION: 'notifications',
  RECOMMENDATION_UPDATE: 'recommendation-updates',
};

async function initKafka() {
  producer = kafka.producer();
  await producer.connect();

  consumer = kafka.consumer({ groupId: 'apartment-service' });
  await consumer.connect();

  await consumer.subscribe({ topics: Object.values(TOPICS), fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const payload = JSON.parse(message.value.toString());
      logger.debug(`Kafka message received on ${topic}:`, payload);
    },
  });

  logger.info('Kafka producer and consumer initialized');
}

async function publishEvent(topic, payload) {
  if (!producer) return;
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify({ ...payload, timestamp: Date.now() }) }],
  });
}

module.exports = { initKafka, publishEvent, TOPICS };
