from sqlalchemy.orm import Session
from app.models.workflow import Workflow
from app.models.agent import Agent
from app.models.session import Session as DBSession
from app.models.entanglement import Entanglement
from app.services.agent_spawner import AgentSpawner
from app.services.entanglement import EntanglementManager
from app.services.audit import log_action

def create_sample_data(db: Session, user_id: int, session_id: int):
    """Create sample workflows, agents, and entanglements for demonstration"""
    
    # Create sample agents
    agent_spawner = AgentSpawner(db)
    
    # Spawn different types of agents
    assistant_agent = agent_spawner.spawn_agent(
        agent_type="assistant",
        name="ChainBot Assistant",
        config={"personality": "helpful"},
        session_id=session_id,
        user_id=user_id
    )
    
    data_agent = agent_spawner.spawn_agent(
        agent_type="data_processor",
        name="Data Processor",
        config={"processing_type": "analytics"},
        session_id=session_id,
        user_id=user_id
    )
    
    api_agent = agent_spawner.spawn_agent(
        agent_type="api",
        name="API Integrator",
        config={"base_url": "https://api.example.com", "api_key": "demo_key"},
        session_id=session_id,
        user_id=user_id
    )
    
    workflow_agent = agent_spawner.spawn_agent(
        agent_type="workflow",
        name="Workflow Manager",
        config={"workflow_engine": "default"},
        session_id=session_id,
        user_id=user_id
    )
    
    # Create sample workflows
    sample_workflows = [
        {
            "name": "Data Analysis Pipeline",
            "description": "A workflow that processes data and generates reports",
            "definition": {
                "steps": [
                    {
                        "id": "step1",
                        "name": "Collect Data",
                        "type": "api_call",
                        "config": {
                            "url": "https://api.example.com/data",
                            "method": "GET",
                            "headers": {"Authorization": "Bearer token"}
                        }
                    },
                    {
                        "id": "step2",
                        "name": "Process Data",
                        "type": "agent_task",
                        "config": {
                            "agent_id": data_agent.id,
                            "task": "Analyze the collected data and identify trends"
                        }
                    },
                    {
                        "id": "step3",
                        "name": "Generate Report",
                        "type": "agent_task",
                        "config": {
                            "agent_id": assistant_agent.id,
                            "task": "Create a comprehensive report based on the analysis"
                        }
                    }
                ]
            }
        },
        {
            "name": "Customer Support Workflow",
            "description": "Automated customer support with escalation",
            "definition": {
                "steps": [
                    {
                        "id": "step1",
                        "name": "Initial Response",
                        "type": "agent_task",
                        "config": {
                            "agent_id": assistant_agent.id,
                            "task": "Provide initial response to customer inquiry"
                        }
                    },
                    {
                        "id": "step2",
                        "name": "Check Resolution",
                        "type": "condition",
                        "config": {
                            "condition": "step1.result.get('resolved', False)"
                        }
                    },
                    {
                        "id": "step3",
                        "name": "Escalate Issue",
                        "type": "agent_task",
                        "config": {
                            "agent_id": workflow_agent.id,
                            "task": "Escalate unresolved issues to human support"
                        }
                    }
                ]
            }
        },
        {
            "name": "API Integration Workflow",
            "description": "Integrate with external APIs and process responses",
            "definition": {
                "steps": [
                    {
                        "id": "step1",
                        "name": "Fetch External Data",
                        "type": "agent_task",
                        "config": {
                            "agent_id": api_agent.id,
                            "task": "Fetch data from external API"
                        }
                    },
                    {
                        "id": "step2",
                        "name": "Validate Data",
                        "type": "agent_task",
                        "config": {
                            "agent_id": data_agent.id,
                            "task": "Validate and clean the fetched data"
                        }
                    },
                    {
                        "id": "step3",
                        "name": "Store Results",
                        "type": "api_call",
                        "config": {
                            "url": "https://api.example.com/store",
                            "method": "POST",
                            "headers": {"Content-Type": "application/json"},
                            "data": {"processed": True}
                        }
                    }
                ]
            }
        },
        {
            "name": "Simple Task Workflow",
            "description": "A simple workflow with a single agent task",
            "definition": {
                "steps": [
                    {
                        "id": "step1",
                        "name": "Process Request",
                        "type": "agent_task",
                        "config": {
                            "agent_id": assistant_agent.id,
                            "task": "Process the user request and provide a response"
                        }
                    }
                ]
            }
        }
    ]
    
    # Create workflows in database
    created_workflows = []
    for workflow_data in sample_workflows:
        workflow = Workflow(
            name=workflow_data["name"],
            description=workflow_data["description"],
            definition=workflow_data["definition"],
            status="draft",
            session_id=session_id
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        created_workflows.append(workflow)
        
        # Log workflow creation
        log_action(db, "sample_workflow_created", user_id, "workflow", workflow.id, 
                  meta={"name": workflow.name})
    
    # Create sample entanglement
    entanglement_manager = EntanglementManager(db, agent_spawner)
    entanglement = entanglement_manager.create_entanglement(
        name="Sample Team",
        description="A sample team of agents working together",
        user_id=user_id
    )
    
    # Add agents to entanglement
    agents = [assistant_agent, data_agent, api_agent, workflow_agent]
    for agent in agents:
        entanglement_manager.add_agent_to_entanglement(
            entanglement_id=entanglement.id,
            agent_id=agent.id,
            user_id=user_id
        )
    
    return {
        "agents": [assistant_agent, data_agent, api_agent, workflow_agent],
        "workflows": created_workflows,
        "entanglement": entanglement
    }

def get_workflow_templates():
    """Get predefined workflow templates"""
    return [
        {
            "id": "data_pipeline",
            "name": "Data Analysis Pipeline",
            "description": "Process data and generate reports",
            "category": "analytics",
            "steps": [
                {
                    "id": "collect",
                    "name": "Collect Data",
                    "type": "api_call",
                    "config": {
                        "url": "https://api.example.com/data",
                        "method": "GET"
                    }
                },
                {
                    "id": "process",
                    "name": "Process Data",
                    "type": "agent_task",
                    "config": {
                        "agent_type": "data_processor",
                        "task": "Analyze the collected data"
                    }
                },
                {
                    "id": "report",
                    "name": "Generate Report",
                    "type": "agent_task",
                    "config": {
                        "agent_type": "assistant",
                        "task": "Create a report based on analysis"
                    }
                }
            ]
        },
        {
            "id": "customer_support",
            "name": "Customer Support",
            "description": "Automated customer support with escalation",
            "category": "support",
            "steps": [
                {
                    "id": "respond",
                    "name": "Initial Response",
                    "type": "agent_task",
                    "config": {
                        "agent_type": "assistant",
                        "task": "Provide initial response to customer"
                    }
                },
                {
                    "id": "check",
                    "name": "Check Resolution",
                    "type": "condition",
                    "config": {
                        "condition": "step1.result.resolved"
                    }
                },
                {
                    "id": "escalate",
                    "name": "Escalate Issue",
                    "type": "agent_task",
                    "config": {
                        "agent_type": "workflow",
                        "task": "Escalate to human support"
                    }
                }
            ]
        },
        {
            "id": "api_integration",
            "name": "API Integration",
            "description": "Integrate with external APIs",
            "category": "integration",
            "steps": [
                {
                    "id": "fetch",
                    "name": "Fetch Data",
                    "type": "api_call",
                    "config": {
                        "url": "https://api.example.com/data",
                        "method": "GET"
                    }
                },
                {
                    "id": "process",
                    "name": "Process Response",
                    "type": "agent_task",
                    "config": {
                        "agent_type": "data_processor",
                        "task": "Process the API response"
                    }
                },
                {
                    "id": "store",
                    "name": "Store Results",
                    "type": "api_call",
                    "config": {
                        "url": "https://api.example.com/store",
                        "method": "POST"
                    }
                }
            ]
        }
    ] 