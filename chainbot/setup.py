#!/usr/bin/env python3
"""
ChainBot ALEX OS Module Setup
Advanced Workflow Orchestration Engine with AI Agent Management
"""

from setuptools import setup, find_packages
import os

# Read the README file
def read_readme():
    with open("README.md", "r", encoding="utf-8") as fh:
        return fh.read()

# Read requirements
def read_requirements():
    with open("requirements.txt", "r", encoding="utf-8") as fh:
        return [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="chainbot-alex-os",
    version="1.0.0",
    author="ChainBot Team",
    author_email="team@chainbot.local",
    description="Advanced workflow orchestration engine with AI agent management for ALEX OS",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    url="https://github.com/chainbot/chainbot-alex-os",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Distributed Computing",
        "Topic :: System :: Monitoring",
    ],
    python_requires=">=3.8",
    install_requires=read_requirements(),
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.1.0",
            "mypy>=1.7.0",
        ],
        "docs": [
            "mkdocs>=1.5.0",
            "mkdocs-material>=9.4.0",
            "mkdocstrings[python]>=0.24.0",
        ],
        "raspberry-pi": [
            "gpiozero>=2.0.0",
            "RPi.GPIO>=0.7.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "chainbot=chainbot.cli:main",
            "chainbot-deploy=chainbot.deploy:main",
        ],
        "alex_os.modules": [
            "chainbot=chainbot.chainbot_module:ChainBotModule",
        ],
    },
    include_package_data=True,
    package_data={
        "chainbot": [
            "config/*.yaml",
            "config/*.json",
            "scripts/*.sh",
        ],
    },
    zip_safe=False,
)
