"""Server-only authorization from native OIDC identity to an assigned research tenant."""
from __future__ import annotations

import hashlib
import json
import math
import re
import time
from dataclasses import dataclass, field
from typing import Callable, Mapping
from urllib.parse import urlsplit


class AccessError(ValueError):
    def __init__(self, code: str = 'denied'):
        super().__init__('Customer research access is unavailable.')
        self.code = code


def https_origin(value: str) -> str:
    try:
        parts = urlsplit(value)
        if (not isinstance(value, str) or len(value) > 2048 or parts.scheme != 'https'
                or not parts.hostname or parts.username is not None or parts.password is not None
                or parts.path not in ('', '/') or parts.query or parts.fragment
                or any(character.isspace() for character in value)
                or (parts.port is not None and not 1 <= parts.port <= 65535)):
            raise ValueError
        return value.rstrip('/')
    except (ValueError, TypeError):
        raise AccessError('configuration') from None


def _unique_pairs(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError
        result[key] = value
    return result


def _constant(value):
    raise ValueError


def _binding_rows(raw: str) -> list[dict]:
    try:
        if not isinstance(raw, str) or len(raw.encode('utf-8')) > 1_048_576:
            raise ValueError
        data = json.loads(raw, object_pairs_hook=_unique_pairs, parse_constant=_constant)
        if (not isinstance(data, dict) or set(data) != {'version', 'bindings'}
                or type(data['version']) is not int or data['version'] != 1
                or not isinstance(data['bindings'], list) or not 1 <= len(data['bindings']) <= 256):
            raise ValueError
        identities, tenants, credentials = set(), {}, {}
        fields = {'issuer', 'subject', 'tenant_id', 'credential_setting', 'enabled'}
        for row in data['bindings']:
            if not isinstance(row, dict) or set(row) != fields:
                raise ValueError
            issuer, subject, tenant, key = (row[name] for name in ('issuer', 'subject', 'tenant_id', 'credential_setting'))
            if any(not isinstance(item, str) or not item or item != item.strip()
                   for item in (issuer, subject, tenant, key)):
                raise ValueError
            parsed = urlsplit(issuer)
            if (parsed.scheme != 'https' or not parsed.hostname or parsed.username is not None
                    or parsed.password is not None or parsed.query or parsed.fragment
                    or len(issuer) > 2048 or len(subject) > 255 or type(row['enabled']) is not bool
                    or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', tenant)
                    or not re.fullmatch(r'REDWOOD_TENANT_TOKEN_[A-Z0-9_]{1,64}', key)):
                raise ValueError
            identity = (issuer, subject)
            if (identity in identities or tenants.get(tenant, key) != key
                    or credentials.get(key, tenant) != tenant):
                raise ValueError
            identities.add(identity)
            tenants[tenant] = key
            credentials[key] = tenant
        return data['bindings']
    except (ValueError, TypeError, KeyError, RecursionError):
        raise AccessError('configuration') from None


@dataclass(frozen=True)
class CustomerAccess:
    mode: str
    tenant_id: str | None
    credential: str = field(repr=False)
    scope: str


def resolve_access(user: Mapping, *, auth_enabled: bool, mode: str, bindings: str,
                   base_url: str, credential_lookup: Callable[[str], object],
                   legacy_token: str = '', authorized_emails: str = '', allow_all: bool = False,
                   now: float | None = None) -> CustomerAccess:
    """Trust only native Streamlit OIDC claims, never customer-supplied identity fields."""
    origin = https_origin(base_url)
    tenant = None
    if mode == 'tenant':
        if not auth_enabled or user.get('is_logged_in') is not True:
            raise AccessError()
        issuer, subject, expiration = user.get('iss'), user.get('sub'), user.get('exp')
        clock = time.time() if now is None else now
        if (not isinstance(issuer, str) or not isinstance(subject, str) or not issuer or not subject
                or type(expiration) is not int or not math.isfinite(clock) or expiration <= clock):
            raise AccessError('expired' if type(expiration) is int and expiration <= clock else 'denied')
        rows = _binding_rows(bindings)
        binding = next((row for row in rows if row['issuer'] == issuer and row['subject'] == subject), None)
        if binding is None or not binding['enabled']:
            raise AccessError()
        credential = credential_lookup(binding['credential_setting'])
        if not isinstance(credential, str) or not 16 <= len(credential) <= 4096 or credential != credential.strip():
            raise AccessError('configuration')
        tenant = binding['tenant_id']
        identity = [issuer, subject]
    elif mode == 'legacy':
        email = str(user.get('email', '')).strip().lower()
        if auth_enabled:
            authorized = {item.strip().lower() for item in authorized_emails.split(',') if item.strip()}
            if user.get('is_logged_in') is not True or not (allow_all or (email and email in authorized)):
                raise AccessError()
        credential = legacy_token
        identity = [str(user.get('iss', 'legacy')), str(user.get('sub') or email)] if auth_enabled else ['local-development']
    else:
        raise AccessError('configuration')
    fingerprint = hashlib.sha256(json.dumps([mode, identity, tenant, origin,
        hashlib.sha256(credential.encode('utf-8')).hexdigest()], separators=(',', ':')).encode('utf-8')).hexdigest()
    return CustomerAccess(mode, tenant, credential, fingerprint)
