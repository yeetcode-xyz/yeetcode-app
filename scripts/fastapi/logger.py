"""
Centralized logging system for YeetCode FastAPI backend

Supports two modes:
- file: Logs to files, minimal console output (only request logs)
- live: Real-time console logging for development and debugging
"""

import os
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
from enum import Enum

class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO" 
    WARNING = "WARNING"
    ERROR = "ERROR"

class LogMode(Enum):
    FILE = "file"
    LIVE = "live"

class YeetCodeLogger:
    """Centralized logger for YeetCode FastAPI backend"""
    
    def __init__(self):
        self.mode = LogMode(os.getenv("LOG_MODE", "live").lower())
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.log_dir = Path("logs")
        
        # Ensure log directory exists for file mode
        if self.mode == LogMode.FILE:
            self.log_dir.mkdir(exist_ok=True)
        
        self._setup_logger()
    
    def _setup_logger(self):
        """Setup the logging configuration"""
        # Create main logger
        self.logger = logging.getLogger("yeetcode")
        self.logger.setLevel(getattr(logging, self.log_level, logging.INFO))
        
        # Clear any existing handlers
        self.logger.handlers.clear()
        
        if self.mode == LogMode.FILE:
            self._setup_file_logging()
        else:  # LIVE mode
            self._setup_live_logging()
    
    def _setup_file_logging(self):
        """Setup file-based logging with minimal console output"""
        # File handler for all logs
        log_file = self.log_dir / f"yeetcode_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)
        
        # Minimal console handler (only INFO and above)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
    
    def _setup_live_logging(self):
        """Setup live console logging for development"""
        console_handler = logging.StreamHandler(sys.stdout)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self._log(LogLevel.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self._log(LogLevel.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self._log(LogLevel.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message"""
        self._log(LogLevel.ERROR, message, **kwargs)
    
    def request(self, method: str, path: str, status_code: int, duration_ms: Optional[float] = None):
        """Log HTTP requests (always shown in both modes)"""
        duration_str = f" ({duration_ms:.1f}ms)" if duration_ms else ""
        self.info(f"REQUEST {method} {path} - {status_code}{duration_str}")
    
    def duel_check(self, message: str, **kwargs):
        """Log duel checking activities (only in live mode to avoid spam in files)"""
        if self.mode == LogMode.LIVE:
            self.debug(f"[DUEL_CHECK] {message}", **kwargs)
    
    def duel_action(self, message: str, **kwargs):
        """Log important duel actions (always logged)"""
        self.info(f"[DUEL] {message}", **kwargs)
    
    def submission_check(self, username: str, problem_slug: str, result: str, **kwargs):
        """Log LeetCode submission checks (live mode only to avoid spam)"""
        if self.mode == LogMode.LIVE:
            context = f" | {', '.join(f'{k}={v}' for k, v in kwargs.items())}" if kwargs else ""
            self.debug(f"[SUBMISSION_CHECK] {username} - {problem_slug}: {result}{context}")
    
    def leetcode_api_call(self, endpoint: str, username: str = None, **kwargs):
        """Log LeetCode API calls (live mode only)"""
        if self.mode == LogMode.LIVE:
            user_part = f" for {username}" if username else ""
            context = f" | {', '.join(f'{k}={v}' for k, v in kwargs.items())}" if kwargs else ""
            self.debug(f"[LEETCODE_API] {endpoint}{user_part}{context}")
    
    def cache_operation(self, operation: str, cache_type: str, **kwargs):
        """Log cache operations"""
        self.debug(f"[CACHE] {operation} - {cache_type}", **kwargs)
    
    def _log(self, level: LogLevel, message: str, **kwargs):
        """Internal logging method"""
        # Add any additional context from kwargs
        if kwargs:
            context_parts = [f"{k}={v}" for k, v in kwargs.items()]
            message = f"{message} | {', '.join(context_parts)}"
        
        # Use the appropriate logging level
        log_func = getattr(self.logger, level.value.lower())
        log_func(message)

# Global logger instance
logger = YeetCodeLogger()

# Convenience functions for easy importing
debug = logger.debug
info = logger.info
warning = logger.warning
error = logger.error
request_log = logger.request
duel_check = logger.duel_check
duel_action = logger.duel_action
submission_check = logger.submission_check
leetcode_api_call = logger.leetcode_api_call
cache_operation = logger.cache_operation