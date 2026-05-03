import motor.motor_asyncio
import redis.asyncio as aioredis
from src.config import settings

mongo_client = None
mongo_db = None
redis_client = None


async def init_mongo():
    global mongo_client, mongo_db
    mongo_client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_uri)
    mongo_db = mongo_client.get_default_database()


async def init_redis():
    global redis_client
    if settings.redis_url:
        redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    else:
        redis_client = aioredis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            password=settings.redis_password or None,
            decode_responses=True,
        )


def get_mongo():
    return mongo_db


def get_redis():
    return redis_client
