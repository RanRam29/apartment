const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

let kafka;
let producer;
let consumer;

function isKafkaEnabled() {
  const raw = process.env.KAFKA_BROKERS;
  if (!raw || !String(raw).trim()) return false;
  const flag = process.env.KAFKA_ENABLED;
  if (flag === '0' || flag === 'false') return false;
  return true;
}

const TOPICS = {
  SWIPE_EVENT: 'swipe-events',
  MATCH_EVENT: 'match-events',
  NOTIFICATION: 'notifications',
  RECOMMENDATION_UPDATE: 'recommendation-updates',
};

async function initKafka() {
  if (!isKafkaEnabled()) {
    logger.info('Kafka skipped (set KAFKA_BROKERS to enable; optional on Render/free tier)');
    return;
  }

  const brokers = String(process.env.KAFKA_BROKERS)
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  if (brokers.length === 0) {
    logger.info('Kafka skipped (KAFKA_BROKERS empty)');
    return;
  }

  process.env.KAFKAJS_NO_PARTITIONER_WARNING = process.env.KAFKAJS_NO_PARTITIONER_WARNING || '1';

  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'apartment-app',
    brokers,
    retry: { initialRetryTime: 300, retries: 5 },
  });

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
