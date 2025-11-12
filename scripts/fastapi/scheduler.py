"""
Task scheduler for YeetCode FastAPI server
Runs background tasks on schedule using APScheduler
"""

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime

from background_tasks import (
    update_user_stats,
    update_bounty_progress,
    generate_daily_problem
)
from cache_dumper import dump_cache_to_db

log = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler = None


def create_scheduler() -> AsyncIOScheduler:
    """Create and configure the scheduler"""
    global scheduler

    if scheduler is not None:
        return scheduler

    scheduler = AsyncIOScheduler()

    # Task 1: Update user stats every 1 minute (FASTER POLLING!)
    scheduler.add_job(
        update_user_stats,
        trigger=IntervalTrigger(minutes=1),
        id='update_user_stats',
        name='Update User Stats',
        replace_existing=True,
        max_instances=1,  # Prevent overlapping runs
    )
    log.info("✅ Scheduled: Update user stats (every 1 minute)")

    # Task 2: Update bounty progress every 5 minutes
    scheduler.add_job(
        update_bounty_progress,
        trigger=IntervalTrigger(minutes=5),
        id='update_bounty_progress',
        name='Update Bounty Progress',
        replace_existing=True,
        max_instances=1,
    )
    log.info("✅ Scheduled: Update bounty progress (every 5 minutes)")

    # Task 3: Generate daily problem at 00:00 UTC daily
    scheduler.add_job(
        generate_daily_problem,
        trigger=CronTrigger(hour=0, minute=0, timezone='UTC'),
        id='generate_daily_problem',
        name='Generate Daily Problem',
        replace_existing=True,
        max_instances=1,
    )
    log.info("✅ Scheduled: Generate daily problem (00:00 UTC daily)")

    # Task 4: Dump cache to DynamoDB every 10 minutes (NEW!)
    scheduler.add_job(
        dump_cache_to_db,
        trigger=IntervalTrigger(minutes=10),
        id='dump_cache_to_db',
        name='Dump Cache to DynamoDB',
        replace_existing=True,
        max_instances=1,
    )
    log.info("✅ Scheduled: Dump cache to DynamoDB (every 10 minutes)")

    return scheduler


def start_scheduler():
    """Start the background task scheduler"""
    global scheduler

    if scheduler is None:
        create_scheduler()

    if not scheduler.running:
        scheduler.start()
        log.info("🚀 Background task scheduler started")

        # Log scheduled jobs
        jobs = scheduler.get_jobs()
        for job in jobs:
            log.info(f"   📋 Job: {job.name} (ID: {job.id}) - Next run: {job.next_run_time}")
    else:
        log.info("⚠️ Scheduler already running")


def stop_scheduler():
    """Stop the background task scheduler"""
    global scheduler

    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=True)
        log.info("🛑 Background task scheduler stopped")
    else:
        log.info("⚠️ Scheduler not running")


def get_scheduler_status() -> dict:
    """Get the current status of the scheduler"""
    global scheduler

    if scheduler is None:
        return {
            "running": False,
            "jobs": []
        }

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": str(job.next_run_time) if job.next_run_time else None,
            "trigger": str(job.trigger),
        })

    return {
        "running": scheduler.running,
        "jobs": jobs
    }


async def trigger_job_manually(job_id: str) -> dict:
    """Manually trigger a scheduled job"""
    global scheduler

    if scheduler is None:
        return {"success": False, "error": "Scheduler not initialized"}

    job = scheduler.get_job(job_id)
    if job is None:
        return {"success": False, "error": f"Job '{job_id}' not found"}

    try:
        # Run the job function directly
        if job_id == 'update_user_stats':
            await update_user_stats()
        elif job_id == 'update_bounty_progress':
            await update_bounty_progress()
        elif job_id == 'generate_daily_problem':
            await generate_daily_problem()
        elif job_id == 'dump_cache_to_db':
            await dump_cache_to_db()
        else:
            return {"success": False, "error": f"Unknown job ID: {job_id}"}

        return {
            "success": True,
            "message": f"Job '{job.name}' executed successfully",
            "job_id": job_id
        }
    except Exception as e:
        log.error(f"Error executing job {job_id}: {e}")
        return {"success": False, "error": str(e)}

