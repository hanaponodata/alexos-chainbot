"""
ChainBot Module for ALEX OS
Advanced Workflow Orchestration Engine with AI Agent Management
"""

from .chainbot_module import ChainBotModule

__version__ = "1.0.0"
__author__ = "ChainBot Team"
__description__ = "Advanced Workflow Orchestration Engine with AI Agent Management"

# Module factory registration
def create_module():
    """Factory function to create ChainBot module instance"""
    return ChainBotModule()

# Export the main module class
__all__ = ["ChainBotModule", "create_module"] 