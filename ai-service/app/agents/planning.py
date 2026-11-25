"""
Planning Agent: Selects an appropriate, safe recovery strategy based on diagnosis and strict risk classification.
"""
from app.models.schemas import RecoveryPlanRequest, RecoveryPlan

# Strict allowlist of permitted autonomous actions
ALLOWLISTED_ACTIONS = {
    "RESTART_CONTAINER": {"risk": "LOW", "requires_approval": False, "est_time_sec": 15},
    "CLEAR_CACHE_AND_RESTART": {"risk": "LOW", "requires_approval": False, "est_time_sec": 20},
    "RELOAD_CONFIGURATION_AND_RESET_CONNECTIONS": {"risk": "LOW", "requires_approval": False, "est_time_sec": 10},
    "SCALE_REPLICAS_OR_THROTTLE": {"risk": "HIGH", "requires_approval": True, "est_time_sec": 60},
    "ROLLBACK_PREVIOUS_VERSION": {"risk": "HIGH", "requires_approval": True, "est_time_sec": 90},
    "PRUNE_DOCKER_CONTAINERS": {"risk": "HIGH", "requires_approval": True, "est_time_sec": 45}
}

class PlanningAgent:
    def __init__(self):
        self.name = "Planning Agent"
        self.role = "Recovery Strategy Architect"

    def create_recovery_plan(self, request: RecoveryPlanRequest) -> RecoveryPlan:
        strategy = request.diagnosis.recommended_strategy
        policy = ALLOWLISTED_ACTIONS.get(strategy, {
            "risk": "HIGH",
            "requires_approval": True,
            "est_time_sec": 30
        })

        return RecoveryPlan(
            action_type=strategy,
            risk_level=policy["risk"],
            requires_approval=policy["requires_approval"],
            estimated_recovery_time_sec=policy["est_time_sec"],
            rollback_plan="Revert to last known stable container state and notify on-call operator",
            execution_payload={
                "target_application": request.application_name,
                "strategy": strategy,
                "grace_period_seconds": 10,
                "risk_tier": policy["risk"]
            }
        )

planning_agent = PlanningAgent()
