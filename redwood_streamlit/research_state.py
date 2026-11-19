"""Opaque access scopes and operation fences for browser-session research history."""
from __future__ import annotations

from dataclasses import dataclass
from typing import MutableMapping


@dataclass(frozen=True)
class ResearchOperation:
    scope: str
    generation: int


def synchronize(state: MutableMapping, scope: str | None) -> None:
    if scope is None or state.get('_research_scope') != scope:
        state['messages'] = []
        state['_research_scope'] = scope
        state['_research_generation'] = state.get('_research_generation', 0) + 1
    elif 'messages' not in state:
        state['messages'] = []


def begin_operation(state: MutableMapping, scope: str) -> ResearchOperation:
    if not scope or state.get('_research_scope') != scope:
        raise ValueError('Research access changed.')
    state['_research_generation'] = state.get('_research_generation', 0) + 1
    return ResearchOperation(scope, state['_research_generation'])


def current_operation(state: MutableMapping, operation: ResearchOperation, current_scope: str | None) -> bool:
    return (current_scope is not None and operation.scope == current_scope
            and state.get('_research_scope') == current_scope
            and state.get('_research_generation') == operation.generation)
