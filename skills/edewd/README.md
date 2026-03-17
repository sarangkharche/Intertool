# COS-12: Data Validation Against Snowflake — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the data contract platform to validate contracts against Snowflake table/view schemas, while hardening the existing S3 path to safely coexist with the new server type.

**Architecture:** Server-type dispatch via `isinstance` on Pydantic discriminated unions. Snowflake validation is a clean submodule in `gha-datacontract-validation` with zero `datacontract-cli` dependency. The core comparison logic is a pure function accepting column metadata — no Snowflake connection in the interface.

**Tech Stack:** Python 3.12, Pydantic v2, pytest, uv, snowflake-connector-python (optional dep), GitHub Actions OIDC

---

## Dependency Graph

```
COS-49 (no deps) ─┬── COS-51 (after COS-49) ── merge any time after PR-1
                  └── COS-14 (after COS-49) ──── COS-15 ──── COS-16

COS-50 (no deps) ──── COS-52 (after COS-50)
```

**PR order:**
- PR-1 (COS-49) and PR-2 (COS-50) are **independent** — can be worked in parallel
- PR-3 (COS-51) merges after PR-1
- PR-4 (COS-52) merges after PR-2
- PR-5 (COS-14) merges after PR-1
- PR-6 (COS-15) merges after PR-5
- PR-7 (COS-16) merges after PR-6

---

## File Map

| File | PR | Action |
|---|---|---|
| `packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py` | PR-1, PR-3, PR-5, PR-7 | Modify |
| `packages/gha-datacontract-validation/tests/test_validate_contracts.py` | PR-1, PR-3, PR-5 | Modify |
| `packages/ingestion-lambda/src/ingestion_lambda/sdp_ingestion_initial_load_tabular.py` | PR-2 | Modify |
| `packages/ingestion-lambda/tests/test_sdp_ingestion_iniital_load_tabular.py` | PR-2 | Modify |
| `packages/ingestion-lambda/src/ingestion_lambda/sdp_data_contract.py` | PR-4 | Modify |
| `packages/ingestion-lambda/tests/test_sdp_data_contract.py` | PR-4 | Modify |
| `packages/ingestion-lambda/tests/fixtures/local_only_contract.yaml` | PR-4 | Create |
| `packages/data-contracts/src/data_contracts/models.py` | PR-5 | Modify |
| `packages/data-contracts/src/data_contracts/__init__.py` | PR-5 | Modify |
| `packages/data-contracts/tests/test_models.py` | PR-5 | Modify |
| `data_contracts/_sample_contract_snowflake/datacontract.yml` | PR-5 | Create |
| `docs/adrs/ADR-002-logical-type-for-snowflake-validation.md` | PR-5 | Create |
| `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/__init__.py` | PR-6 | Create |
| `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/type_mapping.py` | PR-6 | Create |
| `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/schema_validator.py` | PR-6 | Create |
| `packages/gha-datacontract-validation/tests/snowflake/__init__.py` | PR-6 | Create |
| `packages/gha-datacontract-validation/tests/snowflake/test_type_mapping.py` | PR-6 | Create |
| `packages/gha-datacontract-validation/tests/snowflake/test_schema_validator.py` | PR-6 | Create |
| `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/connector.py` | PR-7 | Create |
| `packages/gha-datacontract-validation/tests/snowflake/test_connector.py` | PR-7 | Create |
| `packages/gha-datacontract-validation/pyproject.toml` | PR-7 | Modify |
| `.github/workflows/datacontract-pr.yml` | PR-7 | Modify |
| `.github/workflows/datacontract-main.yml` | PR-7 | Modify |

---

## PR-1 — COS-49: Refactor `check_servers()` — extract S3 dispatch pattern

**Branch:** `COS-49-check-servers-dispatch`

**Files:**
- Modify: `packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py`
- Modify: `packages/gha-datacontract-validation/tests/test_validate_contracts.py`

### What this does

`check_servers()` currently has inline S3 bucket validation for all non-local servers (lines ~385–443). This refactor:
1. Extracts that logic into `_validate_s3_server(contract_path, server, env) -> list[Check]`
2. Adds `isinstance(server, S3Server)` dispatch where the bucket check used to live
3. Adds an `else` branch that **fails loudly** for any server type not explicitly handled

No behaviour changes for existing S3/local contracts.

---

- [ ] **Step 1: Write the failing test for the unknown-type else branch**

In `packages/gha-datacontract-validation/tests/test_validate_contracts.py`, add to `TestCheckServers`:

```python
from unittest.mock import MagicMock

def test_unknown_server_type_fails(self):
    """Non-S3, non-local server in a non-local position should fail loudly."""
    # Build a contract with a mock server that isn't S3Server or LocalServer
    spec = create_minimal_contract_model(
        servers=[
            S3Server(
                type="s3",
                server="prod",
                environment="prod",
                description="prod",
                location="s3://storio-sdp-ingest-martech/",
            )
        ]
    )
    # Inject a fake server directly into the dict to bypass Pydantic union
    fake_server = MagicMock()
    fake_server.server = "prod"
    fake_server.type = "unknown"

    # Patch the servers list on the spec — bypass model validation
    import gha_datacontract_validation.validate_contracts as vc
    original_servers = spec.servers
    spec.__dict__["servers"] = [fake_server]  # bypass property

    server_check = check_servers(
        "data_contracts/ingest_martech/adobe/analytics/v1.0/datacontract.yml",
        spec,
        "prod",
    )

    spec.__dict__["servers"] = original_servers  # restore

    assert server_check.server_name is None
    assert server_check.result.is_failed() is True
    assert any(
        "unknown" in (c.message or "").lower() or c.status == "error"
        for c in server_check.result.checks
    )
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /path/to/repo
uv run pytest packages/gha-datacontract-validation/tests/test_validate_contracts.py::TestCheckServers::test_unknown_server_type_fails -v
```
Expected: `FAILED` (function not yet refactored)

- [ ] **Step 3: Implement the refactor**

In `validate_contracts.py`, add the import at the top:
```python
from data_contracts import S3Server
```

Extract the bucket validation into a helper (insert after the `skipped_result` function, around line 68):
```python
def _validate_s3_server(
    contract_path: str, server: S3Server, env: str
) -> list[Check]:
    """Validate S3 server bucket location for the given environment."""
    match = re.match(DOMAIN_FROM_PATH, contract_path)
    if not match:
        print(
            f"ERROR: Could not extract domain from contract path: {contract_path}."
        )
        return [
            Check(
                key=f"validate_{env}_server",
                status="error",
                message=f"Could not extract domain from contract path: {contract_path}",
            )
        ]
    domain_name = match.group(1)
    if env in {"dev", "uat"}:
        expected_bucket_path = (
            f"s3://storio-sdp-ingest-{domain_name.replace('_', '-')}-{env}/"
        )
    else:
        expected_bucket_path = (
            f"s3://storio-sdp-ingest-{domain_name.replace('_', '-')}/"
        )
    if server.location and server.location.startswith(expected_bucket_path):
        return [Check(key=f"validate_{env}_server", status="passed")]
    print(
        f"ERROR: Server location '{server.location}' does not match "
        f"expected bucket path '{expected_bucket_path}' for environment "
        f"'{env}' in contract {contract_path}."
    )
    return [
        Check(
            key=f"validate_{env}_server",
            status="failed",
            message=(
                f"Server location '{server.location}' does not match "
                f"expected bucket path '{expected_bucket_path}' for "
                f"environment '{env}'."
            ),
        )
    ]
```

Replace the bucket-validation block in `check_servers()` (currently lines ~385–443 — the `if selected_server == LOCAL_SERVER: ... else: ...` block) with:

```python
    # Dispatch by server type
    if selected_server == LOCAL_SERVER:
        print(
            f"INFO: Skipping S3 bucket validation for server '{env}' in contract "
            f"{contract_path}."
        )
        result.checks.append(
            Check(
                key=f"validate_{env}_server",
                status="passed",
                message=f"Skipped bucket validation for '{env}' server.",
            )
        )
    elif isinstance(server, S3Server):
        result.checks.extend(_validate_s3_server(contract_path, server, env))
    else:
        print(
            f"ERROR: Unknown server type '{server.type}' for server '{selected_server}' "
            f"in contract {contract_path}. Add a dispatch branch in check_servers()."
        )
        result.checks.append(
            Check(
                key=f"validate_{env}_server",
                status="error",
                message=(
                    f"Unknown server type '{server.type}': no validation handler. "
                    f"Add a dispatch branch in check_servers()."
                ),
            )
        )
        # Return without server_name so the test step is skipped for unknown types
        return ServerCheckResult(result=result)
    return ServerCheckResult(result=result, server_name=selected_server)
```

- [ ] **Step 4: Run all validation tests**

```bash
uv run pytest packages/gha-datacontract-validation/tests/ -v
```
Expected: All pass including `test_unknown_server_type_fails`.

- [ ] **Step 5: Run full validation suite**

```bash
uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest
```
Expected: All pass (exit code 0).

- [ ] **Step 6: Commit**

```bash
git add packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py
git add packages/gha-datacontract-validation/tests/test_validate_contracts.py
git commit -m "refactor(COS-49): extract S3 dispatch pattern in check_servers()

Move inline S3 bucket validation to _validate_s3_server() and add
isinstance dispatch. The else branch fails loudly for unknown server
types — ensures any future type added to the model without a handler
is caught in CI."
```

---

## PR-2 — COS-50: Add lambda guard — skip initial load for non-S3 contracts

**Branch:** `COS-50-lambda-guard-non-s3`
**Independent of PR-1** — can be worked in parallel.

**Files:**
- Modify: `packages/ingestion-lambda/src/ingestion_lambda/sdp_ingestion_initial_load_tabular.py`
- Modify: `packages/ingestion-lambda/tests/test_sdp_ingestion_iniital_load_tabular.py`

### What this does

The lambda's `SdpIngestionInitialLoadTabular.run()` currently assumes all contracts have S3 servers and immediately attempts to list files in a domain S3 bucket. When a non-S3 contract is published to the S3 registry, this should be a clean no-op with a clear log message.

---

- [ ] **Step 1: Write the failing tests**

In `packages/ingestion-lambda/tests/test_sdp_ingestion_iniital_load_tabular.py`, add:

```python
from pathlib import Path
from data_contracts import LocalServer

# Helper to build a mock contract with only local servers
def _make_contract_with_servers(servers):
    """Build a minimal mock SdpDataContract substitute."""
    from types import SimpleNamespace
    return SimpleNamespace(id="test_contract", servers=servers)


@patch("ingestion_lambda.sdp_ingestion_initial_load_tabular.get_sdp_data_contract")
def test_run_skips_initial_load_for_non_s3_contract(
    mock_get_sdp_data_contract,
):
    """Contract with no S3 servers should skip initial load entirely."""
    local_server = LocalServer(
        type="local",
        server="local",
        environment="dev",
        description="local only",
        path="./data/file.csv",
        format="csv",
    )
    mock_contract = _make_contract_with_servers([local_server])
    mock_get_sdp_data_contract.return_value = mock_contract

    ingestion_context = make_ingestion_context()
    env_vars = make_env_vars()
    service = SdpIngestionInitialLoadTabular(
        ingestion_context=ingestion_context,
        ingestion_service_env_vars=env_vars,
        domain_data_bucket=MagicMock(),
        list_of_files_to_ingest=["file1.csv"],
    )

    failures, successes = service.run()

    assert failures == []
    assert successes == []


@patch("ingestion_lambda.sdp_ingestion_initial_load_tabular.orchestrate_load_to_snowflake")
@patch("ingestion_lambda.sdp_ingestion_initial_load_tabular.get_sdp_data_contract")
def test_run_proceeds_for_s3_contract(
    mock_get_sdp_data_contract,
    mock_orchestrate,
):
    """Contract with S3 servers should proceed with initial load."""
    from data_contracts import S3Server
    s3_server = S3Server(
        type="s3",
        server="prod",
        environment="prod",
        description="prod",
        location="s3://bucket/",
    )
    mock_contract = _make_contract_with_servers([s3_server])
    mock_get_sdp_data_contract.return_value = mock_contract
    mock_orchestrate.return_value = None  # success

    ingestion_context = make_ingestion_context()
    env_vars = make_env_vars()
    service = SdpIngestionInitialLoadTabular(
        ingestion_context=ingestion_context,
        ingestion_service_env_vars=env_vars,
        domain_data_bucket=MagicMock(),
        list_of_files_to_ingest=["file1.csv"],
    )

    failures, successes = service.run()

    assert successes == ["file1.csv"]
    mock_orchestrate.assert_called_once()
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest packages/ingestion-lambda/tests/test_sdp_ingestion_iniital_load_tabular.py::test_run_skips_initial_load_for_non_s3_contract packages/ingestion-lambda/tests/test_sdp_ingestion_iniital_load_tabular.py::test_run_proceeds_for_s3_contract -v
```
Expected: `FAILED` (guard not yet added).

- [ ] **Step 3: Add the guard in `sdp_ingestion_initial_load_tabular.py`**

Add the import at the top of the file:
```python
from data_contracts import S3Server
```

In `SdpIngestionInitialLoadTabular.run()`, immediately after the `logger.info(f"retrieved data_contract...")` line, insert:

```python
        if not any(isinstance(s, S3Server) for s in sdp_data_contract.servers):
            logger.info(
                f"Contract {sdp_data_contract.id} has no S3 servers. "
                "Skipping initial load."
            )
            return [], []
```

- [ ] **Step 4: Run all ingestion-lambda tests**

```bash
uv run pytest packages/ingestion-lambda/tests/ -v
```
Expected: All pass.

- [ ] **Step 5: Run full suite**

```bash
uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest
```
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/ingestion-lambda/src/ingestion_lambda/sdp_ingestion_initial_load_tabular.py
git add packages/ingestion-lambda/tests/test_sdp_ingestion_iniital_load_tabular.py
git commit -m "feat(COS-50): skip initial load for non-S3 contracts

Contracts published to the S3 registry that have no S3 servers
(e.g. Snowflake contracts) previously triggered a harmless but
noisy 0-file listing. The guard exits cleanly with a log message."
```

---

## PR-3 — COS-51: Add type-homogeneity validation for contract servers

**Branch:** `COS-51-server-type-homogeneity`
**Merge after PR-1 (COS-49).**

**Files:**
- Modify: `packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py`
- Modify: `packages/gha-datacontract-validation/tests/test_validate_contracts.py`

### What this does

A contract where `prod` is `type: s3` but `uat` is `type: snowflake` would cause divergent behaviour. This check prevents it: all non-local servers in a contract must share the same `type`.

---

- [ ] **Step 1: Write the failing tests**

In `test_validate_contracts.py`, add to `TestCheckServers`:

```python
def test_homogeneous_s3_servers_pass(self):
    """All S3 (+ optional local) servers should pass homogeneity check."""
    spec = create_minimal_contract_model(
        servers=[
            S3Server(
                type="s3", server="prod", environment="prod",
                description="prod", location="s3://storio-sdp-ingest-martech/",
            ),
            S3Server(
                type="s3", server="uat", environment="uat",
                description="uat", location="s3://storio-sdp-ingest-martech-uat/",
            ),
            LocalServer(
                type="local", server="local", environment="local",
                description="local", path="./data/file.csv", format="csv",
            ),
        ]
    )
    server_check = check_servers(
        "data_contracts/ingest_martech/adobe/analytics/v1.0/datacontract.yml",
        spec,
        "prod",
    )
    # The implementation always adds a server_type_homogeneity check (passed or failed).
    # This is a genuine red test: the key won't exist before the implementation is added.
    assert any(
        c.key == "server_type_homogeneity" and c.status == "passed"
        for c in server_check.result.checks
    )

def test_local_only_servers_pass_homogeneity(self):
    """Local-only contract has no non-local types — passes."""
    spec = create_minimal_contract_model(
        servers=[
            LocalServer(
                type="local", server="local", environment="local",
                description="local", path="./data/file.csv", format="csv",
            ),
        ]
    )
    server_check = check_servers(
        "data_contracts/ingest_martech/adobe/analytics/v1.0/datacontract.yml",
        spec,
        "dev",
    )
    # local-only contracts have no non-local types (empty set) — should pass
    assert any(
        c.key == "server_type_homogeneity" and c.status == "passed"
        for c in server_check.result.checks
    )

def test_mixed_server_types_fail_homogeneity(self):
    """Mock a mixed-type scenario (S3 + non-S3) — must fail."""
    from unittest.mock import MagicMock

    spec = create_minimal_contract_model(servers=[
        S3Server(
            type="s3", server="prod", environment="prod",
            description="prod", location="s3://storio-sdp-ingest-martech/",
        ),
    ])
    # Inject a second server with a different type to simulate future Snowflake
    fake_server = MagicMock()
    fake_server.type = "snowflake"
    fake_server.server = "uat"
    original_servers = list(spec.servers)
    spec.__dict__["servers"] = original_servers + [fake_server]

    server_check = check_servers(
        "data_contracts/ingest_martech/adobe/analytics/v1.0/datacontract.yml",
        spec,
        "prod",
    )

    spec.__dict__["servers"] = original_servers
    assert server_check.server_name is None
    assert server_check.result.is_failed() is True
    assert any(
        c.key == "server_type_homogeneity" and c.status == "failed"
        for c in server_check.result.checks
    )
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest packages/gha-datacontract-validation/tests/test_validate_contracts.py::TestCheckServers::test_mixed_server_types_fail_homogeneity -v
```
Expected: `FAILED` (check not yet implemented).

- [ ] **Step 3: Add homogeneity check in `check_servers()`**

In `validate_contracts.py`, in `check_servers()`, immediately after the `servers = {s.server: s for s in contract_spec.servers}` line (around line 327), insert:

```python
    # Validate all non-local servers share the same type
    non_local_types = {s.type for s in contract_spec.servers if s.type != "local"}
    if len(non_local_types) > 1:
        types_str = ", ".join(sorted(non_local_types))
        print(
            f"ERROR: Contract {contract_path} mixes server types: {types_str}. "
            "All non-local servers must share the same type."
        )
        result.checks.append(
            Check(
                key="server_type_homogeneity",
                status="failed",
                message=(
                    f"Contract servers must all have the same type, "
                    f"found: {types_str}"
                ),
            )
        )
        return ServerCheckResult(result=result)
    # Always add the homogeneity check so tests can assert its presence
    result.checks.append(Check(key="server_type_homogeneity", status="passed"))
```

- [ ] **Step 4: Run all validation tests**

```bash
uv run pytest packages/gha-datacontract-validation/tests/ -v
```
Expected: All pass.

- [ ] **Step 5: Run full suite**

```bash
uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest
```
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py
git add packages/gha-datacontract-validation/tests/test_validate_contracts.py
git commit -m "feat(COS-51): validate server type homogeneity across environments

A contract mixing s3 and snowflake non-local servers would cause
divergent behaviour across environments — the S3 pipeline would
process one env but skip the other. Fail fast with a clear message."
```

---

## PR-4 — COS-52: Narrow `SdpDataContract` to `S3Server`

**Branch:** `COS-52-narrow-sdp-data-contract`
**Merge after PR-2 (COS-50).**

**Files:**
- Modify: `packages/ingestion-lambda/src/ingestion_lambda/sdp_data_contract.py`
- Modify: `packages/ingestion-lambda/tests/test_sdp_data_contract.py`
- Create: `packages/ingestion-lambda/tests/fixtures/local_only_contract.yaml`

### What this does

`SdpDataContract` imports `Server` (the union) but only ever operates on S3 contracts — `set_server_location()` calls `server.location` which doesn't exist on `LocalServer`. This narrows the wrapper to `S3Server` explicitly and raises `InvalidDataContractDefinition` at construction time if a non-S3 server is found.

---

- [ ] **Step 1: Create the local-only fixture**

Create `packages/ingestion-lambda/tests/fixtures/local_only_contract.yaml`:

```yaml
apiVersion: v3.0.1
kind: DataContract
id: ingest_test_domain/storio/service/local_entity/v1.0
name: Local Only Test Contract
domain: TEST_DOMAIN
dataProduct: Local Entity
version: v1.0.0
status: draft
description:
  purpose: Local-only contract for testing the S3 guard in SdpDataContract.
support:
  - channel: Test Support Channel
    url: https://example.slack/workspace/test-channel
    description: Test support channel
    tool: slack
    scope: issues
servers:
  - server: local
    type: local
    description: Local dev server only
    environment: dev
    path: ./data/file.csv
    format: csv
schema:
  - name: test_table
    physicalType: file
    properties:
      - name: id
        description: Unique identifier
        logicalType: integer
        classification: public
        required: true
```

- [ ] **Step 2: Write the failing test**

In `packages/ingestion-lambda/tests/test_sdp_data_contract.py`, add:

```python
def test_contract_with_non_s3_server_raises_error() -> None:
    """SdpDataContract must refuse to load a non-S3 contract."""
    with pytest.raises(InvalidDataContractDefinition, match="non-S3"):
        SdpDataContract(str(FIXTURES_DIR / "local_only_contract.yaml"))
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
uv run pytest packages/ingestion-lambda/tests/test_sdp_data_contract.py::test_contract_with_non_s3_server_raises_error -v
```
Expected: `FAILED` (no guard yet).

- [ ] **Step 4: Implement the narrowing in `sdp_data_contract.py`**

Change the import:
```python
# Before:
from data_contracts import DataContract as DataContractModel
from data_contracts import SchemaObject, SchemaProperty, Server

# After:
from data_contracts import DataContract as DataContractModel
from data_contracts import S3Server, SchemaObject, SchemaProperty
```

In `SdpDataContract.__init__()`, after `self._id = self._spec.id`, add:

```python
        non_s3 = [
            s.server for s in self._spec.servers if not isinstance(s, S3Server)
        ]
        if non_s3:
            raise InvalidDataContractDefinition(
                f"Contract '{self._id}' contains non-S3 servers: {non_s3}. "
                "SdpDataContract only handles S3 contracts."
            )
```

Update the `servers` property type annotation:

```python
    @property
    def servers(self) -> list[S3Server]:
        """Get all S3 server definitions from the data contract."""
        return [s for s in self._spec.servers if isinstance(s, S3Server)]
```

Update `get_server()` return type:

```python
    def get_server(self, server_name: str) -> S3Server:
        """Get an S3Server by name."""
        server_index = self.get_server_index(server_name)
        return self.servers[server_index]
```

- [ ] **Step 5: Run all ingestion-lambda tests**

```bash
uv run pytest packages/ingestion-lambda/tests/ -v
```
Expected: All pass including the new test.

- [ ] **Step 6: Run full suite**

```bash
uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest
```
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add packages/ingestion-lambda/src/ingestion_lambda/sdp_data_contract.py
git add packages/ingestion-lambda/tests/test_sdp_data_contract.py
git add packages/ingestion-lambda/tests/fixtures/local_only_contract.yaml
git commit -m "feat(COS-52): narrow SdpDataContract to S3Server

The wrapper only operates on S3 contracts — set_server_location()
calls server.location which doesn't exist on LocalServer or future
SnowflakeServer. Fail fast at construction with InvalidDataContractDefinition
rather than at a random attribute access deep in the ingestion path."
```

---

## PR-5 — COS-14: Extend server validation for type: snowflake

**Branch:** `COS-14-snowflake-server-model`
**Merge after PR-1 (COS-49).**

**Files:**
- Modify: `packages/data-contracts/src/data_contracts/models.py`
- Modify: `packages/data-contracts/src/data_contracts/__init__.py`
- Create: `data_contracts/_sample_contract_snowflake/datacontract.yml`
- Create: `docs/adrs/ADR-002-logical-type-for-snowflake-validation.md`
- Modify: `packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py`
- Modify: `packages/gha-datacontract-validation/tests/test_validate_contracts.py`
- Modify: `packages/data-contracts/tests/test_models.py` (or existing test file)

### What this does

1. Adds `SnowflakeServer` Pydantic model to `data-contracts`
2. Updates `Server` discriminated union to include `SnowflakeServer`
3. Expands `SchemaObject.physicalType` from `"file"` to `"file" | "table" | "view"`
4. Adds a `@model_validator` cross-validating server type ↔ `physicalType`
5. Adds a Snowflake dispatch branch in `check_servers()` (structural pass — no schema comparison yet)
6. Writes ADR-002 and a sample Snowflake contract

---

- [ ] **Step 1: Write failing model tests**

In `packages/data-contracts/tests/test_models.py` (add a new class):

```python
from data_contracts import SnowflakeServer  # will fail until implemented

class TestSnowflakeServerModel:
    def test_valid_snowflake_server(self):
        server = SnowflakeServer(
            type="snowflake",
            server="prod",
            environment="prod",
            description="Snowflake prod",
            account="xy12345.eu-west-1",
            database="SDP_PROD",
            schema_="WEB_ANALYTICS",
        )
        assert server.type == "snowflake"
        assert server.account == "xy12345.eu-west-1"
        assert server.database == "SDP_PROD"
        assert server.schema_ == "WEB_ANALYTICS"

    def test_snowflake_server_requires_account(self):
        with pytest.raises(Exception):
            SnowflakeServer(
                type="snowflake",
                server="prod",
                environment="prod",
                description="missing account",
                database="DB",
                schema_="SCHEMA",
            )

class TestPhysicalTypeCrossValidation:
    """physicalType must match server type."""

    def _base_contract(self, servers, physical_type):
        from data_contracts import Description, SchemaObject, SchemaProperty, Support, DataContract
        return DataContract(
            apiVersion="v3.0.1",
            kind="DataContract",
            id="test/test/test/test/v1.0",
            name="Test",
            domain="test",
            dataProduct="test",
            version="v1.0.0",
            status="draft",
            description=Description(purpose="test"),
            servers=servers,
            support=[Support(channel="c", url="u", description="d", tool="slack")],
            schema_=[SchemaObject(
                name="test",
                physicalType=physical_type,
                properties=[SchemaProperty(
                    name="id",
                    logicalType="integer",
                    description="id",
                    classification="internal",
                )],
            )],
        )

    def test_s3_server_with_file_physicaltype_passes(self):
        from data_contracts import S3Server
        servers = [S3Server(type="s3", server="prod", environment="prod",
                            description="x", location="s3://bucket/")]
        contract = self._base_contract(servers, "file")
        assert contract is not None

    def test_s3_server_with_table_physicaltype_fails(self):
        from data_contracts import S3Server
        import pytest
        from pydantic import ValidationError
        servers = [S3Server(type="s3", server="prod", environment="prod",
                            description="x", location="s3://bucket/")]
        with pytest.raises(ValidationError, match="physicalType"):
            self._base_contract(servers, "table")

    def test_snowflake_server_with_table_physicaltype_passes(self):
        from data_contracts import SnowflakeServer
        servers = [SnowflakeServer(type="snowflake", server="prod",
                                   environment="prod", description="x",
                                   account="acc", database="DB", schema_="SC")]
        contract = self._base_contract(servers, "table")
        assert contract is not None

    def test_snowflake_server_with_file_physicaltype_fails(self):
        from data_contracts import SnowflakeServer
        import pytest
        from pydantic import ValidationError
        servers = [SnowflakeServer(type="snowflake", server="prod",
                                   environment="prod", description="x",
                                   account="acc", database="DB", schema_="SC")]
        with pytest.raises(ValidationError, match="physicalType"):
            self._base_contract(servers, "file")
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest packages/data-contracts/tests/ -v -k "TestSnowflakeServerModel or TestPhysicalTypeCrossValidation"
```
Expected: Import error / FAILED.

- [ ] **Step 3: Add `SnowflakeServer` to `models.py`**

In `packages/data-contracts/src/data_contracts/models.py`:

After the `LocalServer` class, add:

```python
class SnowflakeServer(ODCSServer):
    type: Literal["snowflake"]
    server: str
    environment: str
    description: str
    account: str
    database: str
    schema_: str = Field(alias="schema")
```

Update the `Server` discriminated union:

```python
Server = Annotated[
    S3Server | SnowflakeServer | LocalServer,
    Field(discriminator="type"),
]
```

Expand `SchemaObject.physicalType`:

```python
class SchemaObject(ODCSSchemaObject):
    name: str
    physicalType: Literal["file", "table", "view"]
    properties: Annotated[
        list[SchemaProperty], Field(min_length=1)
    ]  # type: ignore[assignment]
```

Add cross-validation on `DataContract`. Inside the `DataContract` class, after the existing `validate_against_odcs_schema` validator:

```python
    @model_validator(mode="after")
    def validate_physical_type_matches_server_type(self) -> Self:
        """Ensure physicalType is consistent with server type.

        S3 contracts must use physicalType='file'.
        Snowflake contracts must use physicalType='table' or 'view'.
        """
        non_local_types = {
            s.type for s in self.servers if s.type != "local"
        }
        for schema_obj in self.schema_:
            if "s3" in non_local_types and schema_obj.physicalType != "file":
                raise ValueError(
                    f"S3 contracts must use physicalType='file', "
                    f"got '{schema_obj.physicalType}' in schema '{schema_obj.name}'"
                )
            if "snowflake" in non_local_types and schema_obj.physicalType not in {
                "table",
                "view",
            }:
                raise ValueError(
                    f"Snowflake contracts must use physicalType='table' or 'view', "
                    f"got '{schema_obj.physicalType}' in schema '{schema_obj.name}'"
                )
        return self
```

- [ ] **Step 4: Export `SnowflakeServer` from `__init__.py`**

In `packages/data-contracts/src/data_contracts/__init__.py`:

```python
from data_contracts.models import (
    DataContract,
    Description,
    LocalServer,
    S3Server,
    SchemaObject,
    SchemaProperty,
    Server,
    SnowflakeServer,
    Support,
)

__all__ = [
    "LocalServer",
    "S3Server",
    "SnowflakeServer",
    "DataContract",
    "Description",
    "SchemaObject",
    "SchemaProperty",
    "Server",
    "Support",
]
```

- [ ] **Step 5: Run data-contracts tests**

```bash
uv run pytest packages/data-contracts/tests/ -v
```
Expected: All pass including new tests.

- [ ] **Step 6: Write the failing test for the Snowflake dispatch branch**

In `test_validate_contracts.py`, update `create_minimal_contract_model` to accept `physical_type` and add a new test class. First, update the helper to support Snowflake:

```python
def create_minimal_snowflake_contract_model(servers):
    """Helper for Snowflake contracts (physicalType=table)."""
    from data_contracts import Description, SchemaObject, SchemaProperty, Support

    return DataContractModel(
        apiVersion="v3.0.1",
        kind="DataContract",
        id="test/test/test/test/v1.0",
        name="Test Contract",
        domain="test",
        dataProduct="test",
        version="v1.0.0",
        status="draft",
        description=Description(purpose="test"),
        servers=servers,
        support=[
            Support(channel="email", url="test@test.com", description="test", tool="email")
        ],
        schema_=[
            SchemaObject(
                name="test_table",
                physicalType="table",
                properties=[
                    SchemaProperty(
                        name="id",
                        logicalType="integer",
                        description="Unique identifier",
                        classification="internal",
                    ),
                ],
            )
        ],
    )


class TestCheckServersSnowflake:
    """Snowflake dispatch in check_servers()."""

    def test_snowflake_server_passes_structural_check(self):
        """Snowflake server selected for prod env should pass (structural only)."""
        from data_contracts import SnowflakeServer

        spec = create_minimal_snowflake_contract_model(
            servers=[
                SnowflakeServer(
                    type="snowflake",
                    server="prod",
                    environment="prod",
                    description="Snowflake prod",
                    account="xy12345.eu-west-1",
                    database="SDP_PROD",
                    schema_="WEB_ANALYTICS",
                )
            ]
        )
        server_check = check_servers(
            "data_contracts/ingest_martech/adobe/analytics/v1.0/datacontract.yml",
            spec,
            "prod",
        )
        assert server_check.server_name == "prod"
        assert server_check.result.is_failed() is False
```

- [ ] **Step 7: Run test to confirm it fails**

```bash
uv run pytest packages/gha-datacontract-validation/tests/test_validate_contracts.py::TestCheckServersSnowflake -v
```
Expected: FAILED (no Snowflake dispatch branch yet — falls into `else` / unknown type error).

- [ ] **Step 8: Add Snowflake dispatch branch in `check_servers()`**

In `validate_contracts.py`, also add the import:
```python
from data_contracts import S3Server, SnowflakeServer
```

In the dispatch block in `check_servers()`, add the Snowflake branch between `S3Server` and `else`:

```python
    elif isinstance(server, SnowflakeServer):
        # Structural validation only — Pydantic enforces required fields.
        # Schema comparison is handled by COS-15.
        print(
            f"INFO: Snowflake server '{selected_server}' in contract {contract_path}. "
            "Structural validation passed."
        )
        result.checks.append(
            Check(key=f"validate_{env}_server", status="passed")
        )
```

- [ ] **Step 9: Run all validation tests**

```bash
uv run pytest packages/gha-datacontract-validation/tests/ -v
```
Expected: All pass including `TestCheckServersSnowflake`.

- [ ] **Step 10: Create sample Snowflake contract**

Create `data_contracts/_sample_contract_snowflake/datacontract.yml`:

```yaml
---
apiVersion: v3.0.1
kind: DataContract

id: ingest_example_domain/provider/snowflake_service/example_table/v1.0
name: Example Snowflake Data Contract
domain: Example Domain
dataProduct: Example Table
version: v1.0.0
status: draft

description:
  purpose: |
    Sample Snowflake data contract. Validates against a Snowflake table/view schema.
    Uses logicalType for database-agnostic type validation (see ADR-002).

support:
  - channel: Example Support Channel
    url: https://example.slack/workspace/support
    description: Support channel for this contract
    tool: slack
    scope: issues

servers:
  - server: prod
    type: snowflake
    description: Snowflake production database
    environment: prod
    account: xy12345.eu-west-1
    database: SDP_PROD
    schema: WEB_ANALYTICS

  - server: uat
    type: snowflake
    description: Snowflake UAT database
    environment: uat
    account: xy12345.eu-west-1
    database: SDP_UAT
    schema: WEB_ANALYTICS

  - server: local
    type: local
    description: Local test data for development
    environment: dev
    path: ./data/example_table.csv
    format: csv

schema:
  - name: example_table
    physicalType: table
    properties:
      - name: id
        description: Unique row identifier
        logicalType: integer
        required: true
        classification: internal
      - name: name
        description: Name field
        logicalType: string
        required: true
        classification: internal
      - name: created_at
        description: Record creation timestamp
        logicalType: date
        classification: internal
```

- [ ] **Step 11: Write and commit ADR-002**

Create `docs/adrs/ADR-002-logical-type-for-snowflake-validation.md`:

```markdown
# ADR-002: Use logicalType for Snowflake Schema Validation

## Status

ACCEPTED

## Context

When validating a data contract against a Snowflake table schema, we need to
compare contract column types to Snowflake column types. Two approaches exist:

1. **`physicalType` on `SchemaProperty`**: Snowflake-specific types like
   `VARCHAR(256)`, `NUMBER(38,0)`. Makes contracts database-specific.
2. **`logicalType`**: Database-agnostic types like `string`, `integer`, `date`.
   Already required by our Pydantic models. Mapping is a platform concern.

## Decision

Validate against `logicalType`. The platform maintains a mapping from ODCS
`logicalType` values to sets of compatible Snowflake column types
(e.g. `"string" → {"VARCHAR", "TEXT", "STRING", "CHAR"}`).

## Rationale

- Contracts describe _business semantics_, not storage details.
- Switching databases (or Snowflake storage types) should not invalidate contracts.
- `logicalType` is already enforced as required — no schema changes needed.
- The mapping lives in the platform (`type_mapping.py`), not in every contract.

## Rejected Options

- **physicalType on properties**: Leaks storage details into the contract.
  Contracts become Snowflake-specific, defeating the abstraction.

## Consequences

- `logicalType` values must all map to Snowflake types — unmapped values are
  errors caught at validation time.
- Future ODCS `logicalType` additions (e.g. `timestamp`, `time` in v3.1.0)
  require updating the mapping before they can be used in Snowflake contracts.
```

- [ ] **Step 12: Run full suite**

```bash
uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest
```
Expected: All pass.

- [ ] **Step 13: Commit**

```bash
git add packages/data-contracts/src/data_contracts/models.py
git add packages/data-contracts/src/data_contracts/__init__.py
git add packages/data-contracts/tests/test_models.py
git add packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py
git add packages/gha-datacontract-validation/tests/test_validate_contracts.py
git add data_contracts/_sample_contract_snowflake/datacontract.yml
git add docs/adrs/ADR-002-logical-type-for-snowflake-validation.md
git commit -m "feat(COS-14): add SnowflakeServer model, physicalType cross-validation, and dispatch

- SnowflakeServer model with required account/database/schema fields
- Server discriminated union now S3Server | SnowflakeServer | LocalServer
- physicalType expanded to file | table | view with server cross-validation
- Snowflake dispatch branch in check_servers() (structural pass)
- Sample Snowflake contract and ADR-002 for logicalType validation approach"
```

---

## PR-6 — COS-15: Implement Snowflake schema validation submodule

**Branch:** `COS-15-snowflake-schema-validation`
**Merge after PR-5 (COS-14).**

**Files:**
- Create: `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/__init__.py`
- Create: `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/type_mapping.py`
- Create: `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/schema_validator.py`
- Create: `packages/gha-datacontract-validation/tests/snowflake/__init__.py`
- Create: `packages/gha-datacontract-validation/tests/snowflake/test_type_mapping.py`
- Create: `packages/gha-datacontract-validation/tests/snowflake/test_schema_validator.py`

### What this does

Pure, library-agnostic Snowflake schema validation:
1. `type_mapping.py` — maps ODCS `logicalType` → set of compatible Snowflake types
2. `schema_validator.py` — `compare_schema()` pure function, takes `ColumnMetadata` list (no Snowflake connection)
3. `schema_validator.py` — `validate_snowflake_schema()` orchestration wrapper, takes a callable for fetching columns

No `datacontract-cli` dependency. No Snowflake connection in the core logic. Fully testable without Snowflake.

---

- [ ] **Step 1: Fix `Result.is_failed()` to not treat warnings as failures**

Warnings from schema validation (extra Snowflake columns) are informational — they must NOT block the pipeline. The current implementation incorrectly treats `"warning"` as a failure.

Write the failing test first in `packages/gha-datacontract-validation/tests/test_validate_contracts.py`:

```python
def test_result_with_only_warnings_is_not_failed():
    from gha_datacontract_validation.validate_contracts import Check, Result
    result = Result(contract_path="test", validation="test", checks=[
        Check(key="extra_col", status="warning", message="Extra column in Snowflake"),
    ])
    assert result.is_failed() is False

def test_result_with_error_is_failed():
    from gha_datacontract_validation.validate_contracts import Check, Result
    result = Result(contract_path="test", validation="test", checks=[
        Check(key="col_type", status="error", message="Unmapped type"),
    ])
    assert result.is_failed() is True
```

Run to confirm `test_result_with_only_warnings_is_not_failed` fails:

```bash
uv run pytest packages/gha-datacontract-validation/tests/test_validate_contracts.py::test_result_with_only_warnings_is_not_failed -v
```

In `validate_contracts.py`, change `Result.is_failed()`:

```python
# Before:
def is_failed(self) -> bool:
    return any(
        check.status in {"warning", "failed", "error"} for check in self.checks
    )

# After:
def is_failed(self) -> bool:
    return any(check.status in {"failed", "error"} for check in self.checks)
```

Run all tests:

```bash
uv run pytest packages/gha-datacontract-validation/tests/ -v
```
Expected: All pass.

- [ ] **Step 2: Create `__init__.py` files**

Create empty `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/__init__.py` and `packages/gha-datacontract-validation/tests/snowflake/__init__.py`.

- [ ] **Step 3: Write failing type mapping tests**

Create `packages/gha-datacontract-validation/tests/snowflake/test_type_mapping.py`:

```python
import pytest
from gha_datacontract_validation.snowflake.type_mapping import (
    LOGICAL_TO_SNOWFLAKE,
    get_compatible_snowflake_types,
)


class TestLogicalToSnowflakeMapping:
    def test_string_maps_to_varchar_variants(self):
        types = LOGICAL_TO_SNOWFLAKE["string"]
        assert "VARCHAR" in types
        assert "TEXT" in types

    def test_integer_maps_to_number_variants(self):
        types = LOGICAL_TO_SNOWFLAKE["integer"]
        assert "NUMBER" in types or "INTEGER" in types

    def test_boolean_maps_to_boolean(self):
        assert "BOOLEAN" in LOGICAL_TO_SNOWFLAKE["boolean"]

    def test_date_maps_to_date_variants(self):
        types = LOGICAL_TO_SNOWFLAKE["date"]
        assert "DATE" in types or "TIMESTAMP_NTZ" in types

    def test_all_logical_types_covered(self):
        """Every logicalType in our Pydantic model must have a mapping."""
        required = {"string", "integer", "date", "number", "boolean", "array", "object"}
        assert required.issubset(LOGICAL_TO_SNOWFLAKE.keys())


class TestGetCompatibleSnowflakeTypes:
    def test_returns_set_for_known_type(self):
        result = get_compatible_snowflake_types("string")
        assert isinstance(result, frozenset)
        assert len(result) > 0

    def test_raises_for_unknown_type(self):
        with pytest.raises(KeyError):
            get_compatible_snowflake_types("not_a_type")
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
uv run pytest packages/gha-datacontract-validation/tests/snowflake/test_type_mapping.py -v
```
Expected: Import error / FAILED.

- [ ] **Step 5: Implement `type_mapping.py`**

Create `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/type_mapping.py`:

```python
"""ODCS logicalType → compatible Snowflake column types.

Uses frozensets because Snowflake has many aliases for the same storage type
(VARCHAR, TEXT, STRING, CHAR are all the same family). Validation passes if
the actual Snowflake column type is in the compatible set.

Note: 'timestamp' and 'time' are defined but not in the current Pydantic model.
They will be enabled when the project upgrades to ODCS v3.1.0.
"""

LOGICAL_TO_SNOWFLAKE: dict[str, frozenset[str]] = {
    "string": frozenset({"VARCHAR", "TEXT", "STRING", "CHAR", "CHARACTER", "NCHAR",
                          "NVARCHAR", "NVARCHAR2", "CHAR VARYING", "NCHAR VARYING"}),
    "integer": frozenset({"NUMBER", "DECIMAL", "NUMERIC", "INT", "INTEGER",
                           "BIGINT", "SMALLINT", "TINYINT", "BYTEINT"}),
    "number": frozenset({"FLOAT", "FLOAT4", "FLOAT8", "DOUBLE", "DOUBLE PRECISION",
                          "REAL", "NUMBER", "DECIMAL", "NUMERIC"}),
    "boolean": frozenset({"BOOLEAN"}),
    "date": frozenset({"DATE", "TIMESTAMP_NTZ", "TIMESTAMP_LTZ", "TIMESTAMP_TZ",
                        "TIMESTAMP", "DATETIME"}),
    "array": frozenset({"ARRAY", "VARIANT"}),
    "object": frozenset({"OBJECT", "VARIANT"}),
    # Forward references — not in current Pydantic model, will be enabled in ODCS v3.1.0
    "timestamp": frozenset({"TIMESTAMP_NTZ", "TIMESTAMP_LTZ", "TIMESTAMP_TZ",
                             "TIMESTAMP", "DATETIME"}),
    "time": frozenset({"TIME"}),
}


def get_compatible_snowflake_types(logical_type: str) -> frozenset[str]:
    """Return the set of Snowflake types compatible with the given logicalType.

    Raises:
        KeyError: If logical_type has no mapping (catches mapping drift).
    """
    return LOGICAL_TO_SNOWFLAKE[logical_type]
```

- [ ] **Step 6: Run type mapping tests**

```bash
uv run pytest packages/gha-datacontract-validation/tests/snowflake/test_type_mapping.py -v
```
Expected: All pass.

- [ ] **Step 7: Write failing schema validator tests**

Create `packages/gha-datacontract-validation/tests/snowflake/test_schema_validator.py`:

```python
import pytest
from data_contracts import DataContract as DataContractModel
from data_contracts import (
    Description, SchemaObject, SchemaProperty, SnowflakeServer, Support,
)
from gha_datacontract_validation.snowflake.schema_validator import (
    ColumnMetadata,
    SnowflakeObjectRef,
    compare_schema,
    validate_snowflake_schema,
)


def make_snowflake_contract(properties: list[SchemaProperty]) -> DataContractModel:
    return DataContractModel(
        apiVersion="v3.0.1",
        kind="DataContract",
        id="test/provider/sf_service/entity/v1.0",
        name="SF Test",
        domain="test",
        dataProduct="entity",
        version="v1.0.0",
        status="draft",
        description=Description(purpose="test"),
        servers=[
            SnowflakeServer(
                type="snowflake",
                server="prod",
                environment="prod",
                description="prod sf",
                account="xy.eu-west-1",
                database="DB",
                schema_="SC",
            )
        ],
        support=[Support(channel="c", url="u", description="d", tool="slack")],
        schema_=[SchemaObject(
            name="entity",
            physicalType="table",
            properties=properties,
        )],
    )


class TestCompareSchema:
    def test_matching_schema_passes(self):
        contract = make_snowflake_contract([
            SchemaProperty(name="id", logicalType="integer",
                           description="id", classification="internal"),
            SchemaProperty(name="name", logicalType="string",
                           description="name", classification="internal"),
        ])
        actual_columns = [
            ColumnMetadata(name="ID", data_type="NUMBER"),
            ColumnMetadata(name="NAME", data_type="VARCHAR"),
        ]
        result = compare_schema(contract, "prod", actual_columns)
        assert result.is_failed() is False

    def test_missing_column_fails(self):
        contract = make_snowflake_contract([
            SchemaProperty(name="id", logicalType="integer",
                           description="id", classification="internal"),
            SchemaProperty(name="name", logicalType="string",
                           description="name", classification="internal"),
        ])
        actual_columns = [
            ColumnMetadata(name="ID", data_type="NUMBER"),
            # name column missing
        ]
        result = compare_schema(contract, "prod", actual_columns)
        assert result.is_failed() is True
        assert any("name" in (c.message or "").lower() for c in result.checks)

    def test_incompatible_type_fails(self):
        contract = make_snowflake_contract([
            SchemaProperty(name="id", logicalType="integer",
                           description="id", classification="internal"),
        ])
        actual_columns = [
            ColumnMetadata(name="ID", data_type="VARCHAR"),  # wrong type
        ]
        result = compare_schema(contract, "prod", actual_columns)
        assert result.is_failed() is True

    def test_extra_snowflake_columns_warn(self):
        """Extra columns in Snowflake (not in contract) should warn, not fail."""
        contract = make_snowflake_contract([
            SchemaProperty(name="id", logicalType="integer",
                           description="id", classification="internal"),
        ])
        actual_columns = [
            ColumnMetadata(name="ID", data_type="NUMBER"),
            ColumnMetadata(name="EXTRA_COL", data_type="VARCHAR"),  # not in contract
        ]
        result = compare_schema(contract, "prod", actual_columns)
        assert result.is_failed() is False
        assert any(c.status == "warning" for c in result.checks)

    def test_column_matching_is_case_insensitive(self):
        """Snowflake stores column names in uppercase — matching must be case-insensitive."""
        contract = make_snowflake_contract([
            SchemaProperty(name="customer_id", logicalType="integer",
                           description="id", classification="internal"),
        ])
        actual_columns = [
            ColumnMetadata(name="CUSTOMER_ID", data_type="NUMBER"),
        ]
        result = compare_schema(contract, "prod", actual_columns)
        assert result.is_failed() is False

    def test_unmapped_logical_type_is_an_error(self):
        """An unmapped logicalType must error (catches mapping drift)."""
        from unittest.mock import patch
        contract = make_snowflake_contract([
            SchemaProperty(name="id", logicalType="integer",
                           description="id", classification="internal"),
        ])
        actual_columns = [ColumnMetadata(name="ID", data_type="NUMBER")]
        with patch(
            "gha_datacontract_validation.snowflake.schema_validator"
            ".get_compatible_snowflake_types",
            side_effect=KeyError("integer"),
        ):
            result = compare_schema(contract, "prod", actual_columns)
        assert result.is_failed() is True


class TestValidateSnowflakeSchema:
    def test_orchestration_calls_fetch_columns(self):
        contract = make_snowflake_contract([
            SchemaProperty(name="id", logicalType="integer",
                           description="id", classification="internal"),
        ])
        fetch_calls: list[SnowflakeObjectRef] = []

        def fake_fetch(ref: SnowflakeObjectRef) -> list[ColumnMetadata]:
            fetch_calls.append(ref)
            return [ColumnMetadata(name="ID", data_type="NUMBER")]

        result = validate_snowflake_schema(contract, "prod", fake_fetch)

        assert len(fetch_calls) == 1
        assert fetch_calls[0].database == "DB"
        assert fetch_calls[0].schema == "SC"
        assert fetch_calls[0].object_name == "entity"
        assert result.is_failed() is False
```

- [ ] **Step 8: Run tests to confirm they fail**

```bash
uv run pytest packages/gha-datacontract-validation/tests/snowflake/test_schema_validator.py -v
```
Expected: Import error / FAILED.

- [ ] **Step 9: Implement `schema_validator.py`**

Create `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/schema_validator.py`:

```python
"""Snowflake schema validation — pure functions, no Snowflake connection.

The public interface accepts ColumnMetadata (a simple dataclass) rather than
Snowflake-specific objects. This keeps the core logic testable without a live
Snowflake connection and library-agnostic per CLAUDE.md's black-box principle.
"""

from collections.abc import Callable
from dataclasses import dataclass

from data_contracts import DataContract as DataContractModel
from data_contracts import SnowflakeServer

from gha_datacontract_validation.validate_contracts import Check, Result
from gha_datacontract_validation.snowflake.type_mapping import get_compatible_snowflake_types


@dataclass(frozen=True)
class ColumnMetadata:
    """Metadata for a single Snowflake column."""
    name: str
    data_type: str


@dataclass(frozen=True)
class SnowflakeObjectRef:
    """Reference to a Snowflake table or view."""
    database: str
    schema: str
    object_name: str


def compare_schema(
    contract: DataContractModel,
    server_name: str,
    actual_columns: list[ColumnMetadata],
) -> Result:
    """Compare contract schema against actual Snowflake columns.

    Pure function — no I/O. Accepts column metadata directly so it is fully
    testable without a Snowflake connection.

    Rules:
    - Every contract property must exist in Snowflake (fail if missing).
    - Actual Snowflake type must be compatible with logicalType (fail if not).
    - Extra Snowflake columns not in the contract produce a warning.
    - Unmapped logicalType produces an error (catches mapping drift).
    - Column name matching is case-insensitive (Snowflake stores uppercase).
    """
    contract_path = f"snowflake/{server_name}"
    result = Result(
        contract_path=contract_path,
        validation="snowflake_schema",
        checks=[],
    )

    schema_obj = contract.schema_[0]
    actual_by_name = {col.name.upper(): col for col in actual_columns}
    contract_names = {prop.name.upper() for prop in schema_obj.properties}

    for prop in schema_obj.properties:
        col_upper = prop.name.upper()
        if col_upper not in actual_by_name:
            result.checks.append(
                Check(
                    key=f"column_{prop.name}_present",
                    status="failed",
                    message=(
                        f"Column '{prop.name}' defined in contract but not found "
                        f"in Snowflake object."
                    ),
                )
            )
            continue

        actual_col = actual_by_name[col_upper]
        actual_type_upper = actual_col.data_type.upper()

        try:
            compatible_types = get_compatible_snowflake_types(prop.logicalType)
        except KeyError:
            result.checks.append(
                Check(
                    key=f"column_{prop.name}_type",
                    status="error",
                    message=(
                        f"No Snowflake type mapping for logicalType "
                        f"'{prop.logicalType}' on column '{prop.name}'. "
                        "Update type_mapping.py."
                    ),
                )
            )
            continue

        if actual_type_upper not in compatible_types:
            result.checks.append(
                Check(
                    key=f"column_{prop.name}_type",
                    status="failed",
                    message=(
                        f"Column '{prop.name}': Snowflake type '{actual_col.data_type}' "
                        f"is not compatible with logicalType '{prop.logicalType}'. "
                        f"Compatible types: {sorted(compatible_types)}"
                    ),
                )
            )
        else:
            result.checks.append(
                Check(key=f"column_{prop.name}_type", status="passed")
            )

    # Warn about extra Snowflake columns not in the contract
    for actual_name_upper, actual_col in actual_by_name.items():
        if actual_name_upper not in contract_names:
            result.checks.append(
                Check(
                    key=f"extra_column_{actual_col.name}",
                    status="warning",
                    message=(
                        f"Snowflake column '{actual_col.name}' is not defined "
                        f"in the contract."
                    ),
                )
            )

    return result


def validate_snowflake_schema(
    contract: DataContractModel,
    server_name: str,
    fetch_columns: Callable[[SnowflakeObjectRef], list[ColumnMetadata]],
) -> Result:
    """Orchestrate Snowflake schema validation.

    Builds a SnowflakeObjectRef from the contract server, calls fetch_columns
    to retrieve actual Snowflake column metadata, and delegates to compare_schema.

    The fetch_columns callable is injected so the caller controls the Snowflake
    connection. The core comparison logic remains library-agnostic.

    Args:
        contract: Validated DataContractModel with a SnowflakeServer.
        server_name: Name of the server to validate against.
        fetch_columns: Callable that accepts a SnowflakeObjectRef and returns
            a list of ColumnMetadata.

    Returns:
        Result with schema comparison checks.
    """
    servers_by_name = {s.server: s for s in contract.servers}
    server = servers_by_name[server_name]
    assert isinstance(server, SnowflakeServer), (
        f"validate_snowflake_schema called with non-Snowflake server '{server_name}'"
    )

    schema_obj = contract.schema_[0]
    ref = SnowflakeObjectRef(
        database=server.database,
        schema=server.schema_,
        object_name=schema_obj.name,
    )
    actual_columns = fetch_columns(ref)
    return compare_schema(contract, server_name, actual_columns)
```

- [ ] **Step 10: Run all Snowflake submodule tests**

```bash
uv run pytest packages/gha-datacontract-validation/tests/snowflake/ -v
```
Expected: All pass.

- [ ] **Step 11: Run full suite**

```bash
uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest
```
Expected: All pass.

- [ ] **Step 12: Commit**

```bash
git add packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/
git add packages/gha-datacontract-validation/tests/snowflake/
git commit -m "feat(COS-15): implement Snowflake schema validation submodule

Pure, library-agnostic validation:
- type_mapping: ODCS logicalType → compatible Snowflake types (frozensets)
- schema_validator: compare_schema() pure fn + validate_snowflake_schema() orchestrator
- Callable injection for fetch_columns — no Snowflake import in core logic
- Case-insensitive column matching, extra-column warnings, unmapped-type errors"
```

---

## PR-7 — COS-16: Wire Snowflake validation into CI

**Branch:** `COS-16-snowflake-ci-integration`
**Merge after PR-6 (COS-15).**

**Files:**
- Create: `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/connector.py`
- Create: `packages/gha-datacontract-validation/tests/snowflake/test_connector.py`
- Modify: `packages/gha-datacontract-validation/pyproject.toml`
- Modify: `packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py`
- Modify: `.github/workflows/datacontract-pr.yml`
- Modify: `.github/workflows/datacontract-main.yml`

### What this does

1. Creates `connector.py` — the **only** file that imports `snowflake-connector-python`. Returns a `fetch_columns` callable.
2. Wires the Snowflake validation path into `validate_contracts()` — lazy connection (only established when a `SnowflakeServer` is encountered in the contracts being validated).
3. Adds `snowflake-connector-python` as optional dependency.
4. Updates CI workflows to provide Snowflake credentials via OIDC.

S3-only PRs never touch Snowflake. The connection is created at most once per `validate_contracts()` call.

---

- [ ] **Step 1: Write failing connector tests**

Create `packages/gha-datacontract-validation/tests/snowflake/test_connector.py`:

```python
"""Unit tests for the Snowflake connector — mock the Snowflake library."""
from unittest.mock import MagicMock, patch

import pytest
from gha_datacontract_validation.snowflake.connector import make_fetch_columns
from gha_datacontract_validation.snowflake.schema_validator import (
    ColumnMetadata,
    SnowflakeObjectRef,
)


class TestMakeFetchColumns:
    def test_returns_callable(self):
        mock_conn = MagicMock()
        fetch = make_fetch_columns(mock_conn)
        assert callable(fetch)

    def test_queries_information_schema_columns(self):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ("ID", "NUMBER"),
            ("NAME", "VARCHAR"),
        ]

        fetch = make_fetch_columns(mock_conn)
        ref = SnowflakeObjectRef(
            database="DB", schema="SC", object_name="MY_TABLE"
        )
        result = fetch(ref)

        mock_cursor.execute.assert_called_once()
        sql = mock_cursor.execute.call_args[0][0]
        assert "INFORMATION_SCHEMA.COLUMNS" in sql
        assert "DB" in sql
        assert "SC" in sql
        assert "MY_TABLE" in sql

        assert result == [
            ColumnMetadata(name="ID", data_type="NUMBER"),
            ColumnMetadata(name="NAME", data_type="VARCHAR"),
        ]
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest packages/gha-datacontract-validation/tests/snowflake/test_connector.py -v
```
Expected: Import error / FAILED.

- [ ] **Step 3: Implement `connector.py`**

Create `packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/connector.py`:

```python
"""Snowflake connector — the ONLY module that imports snowflake-connector-python.

Provides a factory function that takes a Snowflake connection and returns a
fetch_columns callable compatible with validate_snowflake_schema().

Isolation rationale: keeping the library import in one place means switching
Snowflake libraries only touches this file. The rest of the codebase is
library-agnostic.
"""

from collections.abc import Callable

from gha_datacontract_validation.snowflake.schema_validator import (
    ColumnMetadata,
    SnowflakeObjectRef,
)


def make_fetch_columns(connection) -> Callable[[SnowflakeObjectRef], list[ColumnMetadata]]:
    """Return a fetch_columns callable backed by the given Snowflake connection.

    The returned callable queries INFORMATION_SCHEMA.COLUMNS for the given
    SnowflakeObjectRef and returns a list of ColumnMetadata.

    Args:
        connection: A snowflake.connector.SnowflakeConnection instance.

    Returns:
        Callable that accepts SnowflakeObjectRef and returns list[ColumnMetadata].
    """

    def fetch_columns(ref: SnowflakeObjectRef) -> list[ColumnMetadata]:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT COLUMN_NAME, DATA_TYPE
            FROM {database}.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '{schema}'
              AND TABLE_NAME = '{object_name}'
            ORDER BY ORDINAL_POSITION
            """.format(
                database=ref.database,
                schema=ref.schema,
                object_name=ref.object_name,
            )
        )
        return [
            ColumnMetadata(name=row[0], data_type=row[1])
            for row in cursor.fetchall()
        ]

    return fetch_columns
```

- [ ] **Step 4: Run connector tests**

```bash
uv run pytest packages/gha-datacontract-validation/tests/snowflake/test_connector.py -v
```
Expected: All pass.

- [ ] **Step 5: Add `snowflake-connector-python` as optional dependency**

In `packages/gha-datacontract-validation/pyproject.toml`, add:

```toml
[project.optional-dependencies]
snowflake = ["snowflake-connector-python>=3.0.0"]
```

- [ ] **Step 6: Write the failing integration test for the wired validate_contracts()**

In `packages/gha-datacontract-validation/tests/test_validate_contracts.py`, add:

```python
class TestValidateContractsSnowflakeIntegration:
    """validate_contracts() correctly calls Snowflake validation for SF contracts."""

    def test_snowflake_contract_triggers_validate_snowflake_schema(self, tmp_path):
        """When a Snowflake contract is processed, validate_snowflake_schema is called."""
        import yaml
        from unittest.mock import patch, MagicMock

        # Write a minimal Snowflake contract to a temp file
        contract_content = {
            "apiVersion": "v3.0.1",
            "kind": "DataContract",
            "id": "test/provider/sf_service/entity/v1.0",
            "name": "SF Test",
            "domain": "test",
            "dataProduct": "entity",
            "version": "v1.0.0",
            "status": "draft",
            "description": {"purpose": "test"},
            "servers": [{
                "server": "prod",
                "type": "snowflake",
                "environment": "prod",
                "description": "sf prod",
                "account": "xy.eu-west-1",
                "database": "DB",
                "schema": "SC",
            }],
            "support": [{"channel": "c", "url": "u", "description": "d", "tool": "slack", "scope": "issues"}],
            "schema": [{"name": "entity", "physicalType": "table", "properties": [
                {"name": "id", "logicalType": "integer", "description": "id", "classification": "internal"},
            ]}],
        }
        contract_path = tmp_path / "datacontract.yml"
        contract_path.write_text(yaml.dump(contract_content))

        results_dir = tmp_path / "results"
        results_dir.mkdir()

        from gha_datacontract_validation.validate_contracts import validate_contracts
        from types import SimpleNamespace

        args = SimpleNamespace(
            changed_files=str(contract_path),
            modified_files="",
            main_contracts=str(tmp_path),
            env="prod",
            test_only=False,
            results_dir=str(results_dir),
        )

        with patch(
            "gha_datacontract_validation.validate_contracts.validate_snowflake_schema"
        ) as mock_sf:
            mock_result = MagicMock()
            mock_result.is_failed.return_value = False
            mock_result.as_dict.return_value = {"contract_path": str(contract_path), "validation": "snowflake_schema", "checks": [], "skipped": False}
            mock_sf.return_value = mock_result

            with patch(
                "gha_datacontract_validation.validate_contracts._get_snowflake_connection"
            ) as mock_conn:
                mock_conn.return_value = MagicMock()
                validate_contracts(args)

        mock_sf.assert_called_once()
```

- [ ] **Step 7: Wire Snowflake into `validate_contracts.py`**

Add imports at the top of `validate_contracts.py`:

```python
import os

from data_contracts import SnowflakeServer
```

Add a lazy connection helper after the constants:

```python
def _get_snowflake_connection():
    """Create a Snowflake connection from environment variables.

    Only called when a SnowflakeServer is encountered. Raises EnvironmentError
    if required environment variables are not set.
    """
    import snowflake.connector  # import lazily — only if needed

    required = ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_AUTHENTICATOR",
                 "SNOWFLAKE_ROLE"]
    missing = [v for v in required if not os.environ.get(v)]
    if missing:
        raise EnvironmentError(
            f"Missing Snowflake environment variables: {missing}. "
            "Set SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_AUTHENTICATOR, "
            "SNOWFLAKE_ROLE."
        )
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        authenticator=os.environ["SNOWFLAKE_AUTHENTICATOR"],
        role=os.environ["SNOWFLAKE_ROLE"],
    )
```

Add imports for the Snowflake submodule at the top:

```python
from gha_datacontract_validation.snowflake.connector import make_fetch_columns
from gha_datacontract_validation.snowflake.schema_validator import validate_snowflake_schema
```

In `validate_contracts()`, add `_snowflake_connection = None` and `_fetch_columns = None` before the contracts loop, then replace the existing "Test" section inside the loop with:

```python
def validate_contracts(args) -> bool:
    changed_files = args.changed_files.split()
    modified_files = set(args.modified_files.split())
    # ... existing setup ...
    _snowflake_connection = None  # lazy — only created when a SnowflakeServer is found
    _fetch_columns = None

    for contract_path in changed_files:
        # ... (all existing checks: schema, lint, breaking, check_servers) ...

        # Look up the selected server object for type dispatch
        selected_server_obj = next(
            (s for s in contract_model.servers
             if s.server == server_check.server_name),
            None,
        ) if server_check.server_name else None

        # Test / Schema comparison (skip if previous checks failed or no server available)
        if failed or selected_server_obj is None:
            test_result = skipped_result(contract_path, "test")
        elif isinstance(selected_server_obj, SnowflakeServer):
            if _snowflake_connection is None:
                _snowflake_connection = _get_snowflake_connection()
                _fetch_columns = make_fetch_columns(_snowflake_connection)
            test_result = validate_snowflake_schema(
                contract_model, server_check.server_name, _fetch_columns
            )
        else:
            test_contract = DataContract(
                data_contract_file=contract_path,
                server=server_check.server_name,
            )
            test_result = run_test(contract_path, test_contract)
```

Replace the existing test block (currently lines ~539–548 in the original file) with the `selected_server_obj` lookup and the three-branch `if/elif/else` above. The `_snowflake_connection`/`_fetch_columns` variables must be declared **outside** the loop so a single connection is reused across all contracts.

- [ ] **Step 8: Run all tests**

```bash
uv run pytest packages/gha-datacontract-validation/tests/ -v
```
Expected: All pass.

- [ ] **Step 9: Update CI workflows**

In `.github/workflows/datacontract-pr.yml`, add Snowflake env vars to the `validate` job's `env` section:

```yaml
env:
  DEV_AWS_ROLE_ARN: ${{ vars.DEV_AWS_ROLE_ARN }}
  UAT_AWS_ROLE_ARN: ${{ vars.UAT_AWS_ROLE_ARN }}
  AWS_REGION: eu-west-1
  SNOWFLAKE_ACCOUNT: ${{ vars.SNOWFLAKE_ACCOUNT }}
  SNOWFLAKE_USER: ${{ vars.SNOWFLAKE_USER }}
  SNOWFLAKE_AUTHENTICATOR: ${{ vars.SNOWFLAKE_AUTHENTICATOR }}
  SNOWFLAKE_ROLE: SDP_CONTRACT_VALIDATOR
```

Do the same for `.github/workflows/datacontract-main.yml`.

> **Note:** `SNOWFLAKE_AUTHENTICATOR` must be stored as a repository variable (`vars.SNOWFLAKE_AUTHENTICATOR`), not hardcoded. For GitHub Actions OIDC federation the correct value is **`oauth`** (token exchange via OIDC JWT), **not** `externalbrowser` (which opens a browser and is unusable in CI). Coordinate with your infrastructure team to confirm the OIDC token URL and set the variable before merging this PR.

> **Terraform prerequisite:** The `SDP_CONTRACT_VALIDATOR` Snowflake role must be provisioned via Terraform before this PR can work end-to-end. Add Terraform resources (role, database/schema USAGE grants) under `infra/modules/` following the existing module pattern. All static Snowflake resources must be created via Terraform per AGENTS.md — no manual CLI calls. This Terraform work can be done in a separate PR that merges before or alongside PR-7.

- [ ] **Step 10: Run full suite**

```bash
uv run ruff format --check . && uv run ruff check . && uv run mypy . && uv run pytest
```
Expected: All pass.

- [ ] **Step 11: Commit**

```bash
git add packages/gha-datacontract-validation/src/gha_datacontract_validation/snowflake/connector.py
git add packages/gha-datacontract-validation/tests/snowflake/test_connector.py
git add packages/gha-datacontract-validation/pyproject.toml
git add packages/gha-datacontract-validation/src/gha_datacontract_validation/validate_contracts.py
git add packages/gha-datacontract-validation/tests/test_validate_contracts.py
git add .github/workflows/datacontract-pr.yml
git add .github/workflows/datacontract-main.yml
git commit -m "feat(COS-16): wire Snowflake schema validation into CI

- connector.py: sole importer of snowflake-connector-python; factory pattern
- validate_contracts(): lazy SF connection (only when SnowflakeServer encountered)
- S3-only PRs never establish a Snowflake connection
- CI: OIDC-federated SNOWFLAKE_ACCOUNT/USER/ROLE passed as env vars
- snowflake-connector-python added as optional dependency [snowflake]"
```

---

## Validation Commands (run before each PR)

```bash
# Format
uv run ruff format --check .

# Lint
uv run ruff check .

# Tests
uv run pytest

# Type check
uv run mypy .
```

All must exit 0.

---

## PR Checklist

| PR | Jira | Branch | Depends on | Status |
|---|---|---|---|---|
| PR-1 | COS-49 | `COS-49-check-servers-dispatch` | — | |
| PR-2 | COS-50 | `COS-50-lambda-guard-non-s3` | — | |
| PR-3 | COS-51 | `COS-51-server-type-homogeneity` | PR-1 | |
| PR-4 | COS-52 | `COS-52-narrow-sdp-data-contract` | PR-2 | |
| PR-5 | COS-14 | `COS-14-snowflake-server-model` | PR-1 | |
| PR-6 | COS-15 | `COS-15-snowflake-schema-validation` | PR-5 | |
| PR-7 | COS-16 | `COS-16-snowflake-ci-integration` | PR-6 | |
