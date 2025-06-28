#!/usr/bin/env python3
"""
ChainBot CLI Main Entry Point
Command-line interface for ChainBot ALEX OS module
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

# Add the project root to the Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from chainbot.chainbot_module import ChainBotModule
from chainbot.config import load_config

app = typer.Typer(
    name="chainbot",
    help="ChainBot ALEX OS Module - Advanced Workflow Orchestration Engine",
    add_completion=False,
)
console = Console()


@app.command()
def version():
    """Show ChainBot version"""
    console.print(f"[bold blue]ChainBot ALEX OS Module[/bold blue] v1.0.0")
    console.print("Advanced Workflow Orchestration Engine with AI Agent Management")


@app.command()
def health():
    """Check ChainBot health status"""
    async def check_health():
        try:
            module = ChainBotModule()
            health_score = await module.health_check()
            status = module.get_status()
            
            table = Table(title="ChainBot Health Status")
            table.add_column("Component", style="cyan")
            table.add_column("Status", style="green")
            table.add_column("Score", style="yellow")
            
            table.add_row("Module", status, f"{health_score:.2f}")
            
            console.print(table)
            
            if health_score >= 0.8:
                console.print("[green]✓ ChainBot is healthy[/green]")
            elif health_score >= 0.5:
                console.print("[yellow]⚠ ChainBot has warnings[/yellow]")
            else:
                console.print("[red]✗ ChainBot is unhealthy[/red]")
                sys.exit(1)
                
        except Exception as e:
            console.print(f"[red]Error checking health: {e}[/red]")
            sys.exit(1)
    
    asyncio.run(check_health())


@app.command()
def start(
    config_file: Optional[Path] = typer.Option(None, "--config", "-c", help="Configuration file path"),
    host: str = typer.Option("127.0.0.1", "--host", "-h", help="Host to bind to"),
    port: int = typer.Option(8000, "--port", "-p", help="Port to bind to"),
    debug: bool = typer.Option(False, "--debug", help="Enable debug mode"),
):
    """Start ChainBot module"""
    async def start_module():
        try:
            # Load configuration
            config = load_config(config_file) if config_file else {}
            
            # Create and initialize module
            module = ChainBotModule()
            
            console.print("[bold blue]Starting ChainBot ALEX OS Module...[/bold blue]")
            
            # Initialize module
            if await module.initialize(config):
                console.print("[green]✓ Module initialized[/green]")
            else:
                console.print("[red]✗ Failed to initialize module[/red]")
                sys.exit(1)
            
            # Start module
            if await module.start():
                console.print("[green]✓ Module started[/green]")
            else:
                console.print("[red]✗ Failed to start module[/red]")
                sys.exit(1)
            
            console.print(f"[bold green]ChainBot is running on http://{host}:{port}[/bold green]")
            console.print("Press Ctrl+C to stop")
            
            # Keep running
            try:
                while True:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                console.print("\n[yellow]Stopping ChainBot...[/yellow]")
                await module.stop()
                console.print("[green]✓ ChainBot stopped[/green]")
                
        except Exception as e:
            console.print(f"[red]Error starting module: {e}[/red]")
            sys.exit(1)
    
    asyncio.run(start_module())


@app.command()
def status():
    """Show ChainBot status"""
    async def get_status():
        try:
            module = ChainBotModule()
            info = module.get_module_info()
            
            table = Table(title="ChainBot Status")
            table.add_column("Property", style="cyan")
            table.add_column("Value", style="green")
            
            table.add_row("Name", info["name"])
            table.add_row("Version", info["version"])
            table.add_row("Status", info["status"])
            table.add_row("Health Score", f"{info['health_score']:.2f}")
            table.add_row("Description", info["description"])
            
            console.print(table)
            
            # Show capabilities
            console.print("\n[bold]Capabilities:[/bold]")
            for capability in info["capabilities"]:
                console.print(f"  • {capability}")
                
        except Exception as e:
            console.print(f"[red]Error getting status: {e}[/red]")
            sys.exit(1)
    
    asyncio.run(get_status())


@app.command()
def deploy(
    target: str = typer.Argument(..., help="Deployment target (local, alex-os, production)"),
    config_file: Optional[Path] = typer.Option(None, "--config", "-c", help="Configuration file path"),
    force: bool = typer.Option(False, "--force", help="Force deployment"),
):
    """Deploy ChainBot to target environment"""
    console.print(f"[bold blue]Deploying ChainBot to {target}...[/bold blue]")
    
    if target == "alex-os":
        # Run the deployment script
        import subprocess
        script_path = Path(__file__).parent.parent.parent / "deploy_alex_os.sh"
        
        if not script_path.exists():
            console.print("[red]Deployment script not found[/red]")
            sys.exit(1)
        
        try:
            result = subprocess.run([str(script_path)], capture_output=True, text=True)
            if result.returncode == 0:
                console.print("[green]✓ Deployment successful[/green]")
            else:
                console.print(f"[red]✗ Deployment failed: {result.stderr}[/red]")
                sys.exit(1)
        except Exception as e:
            console.print(f"[red]Error during deployment: {e}[/red]")
            sys.exit(1)
    else:
        console.print(f"[yellow]Deployment to {target} not yet implemented[/yellow]")


@app.command()
def test():
    """Run ChainBot tests"""
    console.print("[bold blue]Running ChainBot tests...[/bold blue]")
    
    import subprocess
    import sys
    
    try:
        result = subprocess.run([sys.executable, "-m", "pytest", "tests/"], capture_output=True, text=True)
        if result.returncode == 0:
            console.print("[green]✓ All tests passed[/green]")
        else:
            console.print(f"[red]✗ Tests failed: {result.stderr}[/red]")
            sys.exit(1)
    except Exception as e:
        console.print(f"[red]Error running tests: {e}[/red]")
        sys.exit(1)


def main():
    """Main entry point"""
    app()


if __name__ == "__main__":
    main()
