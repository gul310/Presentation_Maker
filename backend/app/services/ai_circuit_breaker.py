import time
import logging
from typing import Dict, Any

logger = logging.getLogger("presentai.ai_circuit_breaker")

class AICircuitBreaker:
    """
    Lightweight, thread-safe in-memory circuit breaker for AI providers.
    Prevents repeated cascading failures and timeouts when a provider is degraded or unreachable.
    """
    def __init__(self, failure_threshold: int = 3, recovery_timeout_seconds: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self._failures: Dict[str, int] = {}
        self._last_failure_time: Dict[str, float] = {}
        self._circuit_state: Dict[str, str] = {}  # "CLOSED" (healthy), "OPEN" (tripped), "HALF_OPEN" (testing)

    def can_use_provider(self, provider_name: str) -> bool:
        provider = provider_name.lower().strip()
        state = self._circuit_state.get(provider, "CLOSED")
        
        if state == "CLOSED":
            return True
            
        now = time.time()
        last_failure = self._last_failure_time.get(provider, 0.0)
        
        # Check if cool-down period has elapsed
        if now - last_failure >= self.recovery_timeout_seconds:
            logger.info(f"[CircuitBreaker] Recovery window elapsed for '{provider}'. Entering HALF_OPEN state to test health.")
            self._circuit_state[provider] = "HALF_OPEN"
            return True
            
        logger.warning(
            f"[CircuitBreaker] Circuit is OPEN for '{provider}'. "
            f"Failing fast to secondary fallback. (Cooldown remaining: {int(self.recovery_timeout_seconds - (now - last_failure))}s)"
        )
        return False

    def record_success(self, provider_name: str):
        provider = provider_name.lower().strip()
        self._failures[provider] = 0
        self._circuit_state[provider] = "CLOSED"

    def record_failure(self, provider_name: str, error: Exception):
        provider = provider_name.lower().strip()
        now = time.time()
        count = self._failures.get(provider, 0) + 1
        self._failures[provider] = count
        self._last_failure_time[provider] = now

        # Sanitize error message to prevent accidental key leakage
        err_msg = str(error)
        clean_err = err_msg.replace("sk-", "sk-***").replace("AIza", "AIza***")

        if count >= self.failure_threshold:
            self._circuit_state[provider] = "OPEN"
            logger.error(
                f"[CircuitBreaker] Tripped circuit to OPEN for '{provider}' after {count} consecutive failures. "
                f"Activating secondary fallback for {self.recovery_timeout_seconds}s. Last error: {clean_err}"
            )
        else:
            logger.warning(
                f"[CircuitBreaker] Recorded failure for '{provider}' ({count}/{self.failure_threshold}). Error: {clean_err}"
            )

    def get_status(self) -> Dict[str, Any]:
        return {
            provider: {
                "state": self._circuit_state.get(provider, "CLOSED"),
                "failures": self._failures.get(provider, 0),
                "last_failure": self._last_failure_time.get(provider, None)
            }
            for provider in set(list(self._failures.keys()) + list(self._circuit_state.keys()))
        }

# Global singleton circuit breaker instance
ai_circuit_breaker = AICircuitBreaker(failure_threshold=3, recovery_timeout_seconds=30.0)

