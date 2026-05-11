import { useEffect, useMemo, useState } from 'react';
import { invoke, view, router } from '@forge/bridge';
import Button from '@atlaskit/button';
import LoadingButton from '@atlaskit/button/loading-button';
import Heading from '@atlaskit/heading';
import Lozenge from '@atlaskit/lozenge';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';

/**
 * OliverAI Forge Panel
 *
 * Auth approach:
 *  - Uses Personal Access Token (PAT) flow.
 *  - On mount: checks for stored token via invoke('checkIdentity').
 *  - If not connected, prompts user to paste a PAT from the SCA dashboard.
 */

function safeIssueTaskFromContext(ctx) {
  const issue = ctx?.extension?.issue;
  const key = issue?.key ? `${issue.key}` : '';
  const summary = issue?.summary ? `${issue.summary}` : '';
  const description = issue?.description ? `${issue.description}` : '';
  const parts = [];
  if (key || summary) parts.push(`[${key}] ${summary}`.trim());
  if (description) parts.push(description);
  return parts.join('\n\n').trim();
}

function App() {
  const [ctx, setCtx] = useState(null);
  const [provider, setProvider] = useState('');
  const [providers, setProviders] = useState([
    { id: 'github', name: 'GitHub' },
    { id: 'bitbucket', name: 'Bitbucket' },
  ]);
  const [repoUrl, setRepoUrl] = useState('');
  const [task, setTask] = useState('');

  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [workspace, setWorkspace] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);

  const [auth, setAuth] = useState({ connected: false, loading: true });
  // eslint-disable-next-line no-unused-vars
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);


  const [discoveryDone, setDiscoveryDone] = useState(false);

  // ─── Auth check — checks for stored token ──────────────────────────────────
  async function refreshAuthStatus(p = provider) {
    setAuth((a) => ({ ...a, loading: true }));
    try {
      if (!p && !discoveryDone) {
        console.log('Performing initial provider discovery...');
        const [gh, bb] = await Promise.all([
          invoke('getGitStatus', { provider: 'github' }).catch(() => ({ connected: false })),
          invoke('getGitStatus', { provider: 'bitbucket' }).catch(() => ({ connected: false }))
        ]);

        setDiscoveryDone(true);

        if (gh?.connected) {
          console.log('Discovery: GitHub connected');
          setProvider('github');
          setAuth({
            connected: true,
            loading: false,
            username: gh.username || 'GitHub User',
          });
        } else if (bb?.connected) {
          console.log('Discovery: Bitbucket connected');
          setProvider('bitbucket');
          setAuth({
            connected: true,
            loading: false,
            username: bb.username || 'Bitbucket User',
          });
        } else {
          console.log('Discovery: No providers connected');
          setAuth({ connected: false, loading: false });
          // Default to github if nothing connected
          if (!provider) setProvider('github');
        }
        return;
      }

      console.log(`Invoking getGitStatus for provider: ${p || 'any'}...`);
      const status = await invoke('getGitStatus', { provider: p });
      console.log('Provider Status:', status);

      if (status?.connected) {
        if (!p && status.provider) {
          setProvider(status.provider);
        }
        setAuth({
          connected: true,
          loading: false,
          username: status.username || (status.provider === 'bitbucket' ? 'Bitbucket User' : 'GitHub User'),
        });
      } else {
        setAuth({ connected: false, loading: false });
      }
    } catch (e) {
      console.error('refreshAuthStatus failed:', e);
      setError(`Auth check failed: ${e.message || String(e)}`);
      setAuth({ connected: false, loading: false });
    }
  }

  // ─── Load context ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const c = await view.getContext();
      if (!mounted) return;
      setCtx(c);
      const inferred = safeIssueTaskFromContext(c);
      if (inferred) setTask(inferred);
    })();
    return () => { mounted = false; };
  }, []);

  // ─── Load git providers ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await invoke('getGitProviders');
        if (!mounted) return;
        if (Array.isArray(res?.providers) && res.providers.length) {
          setProviders(res.providers);
          // Only set default provider if not already set by discovery or previous state
          if (!provider && !discoveryDone) {
            setProvider(res.providers[0].id);
          }
        }
      } catch (e) {
        setWarning('Using default provider list; failed to load from backend.');
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Check auth on mount or provider change ──────────────────────────────────
  useEffect(() => {
    refreshAuthStatus(provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  // ─── Load workspaces for Bitbucket ──────────────────────────────────────────
  useEffect(() => {
    if (!auth.connected || provider !== 'bitbucket') {
      setWorkspaces([]);
      return;
    }

    let mounted = true;
    setWorkspacesLoading(true);
    (async () => {
      try {
        const res = await invoke('getWorkspaces', { provider });
        if (!mounted) return;
        const fetchedWorkspaces = Array.isArray(res?.workspaces) ? res.workspaces : [];
        setWorkspaces(fetchedWorkspaces);
      } catch (e) {
        if (!mounted) return;
        setWorkspaces([]);
      } finally {
        if (mounted) setWorkspacesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [auth.connected, provider]);

  // ─── Load repositories once connected ─────────────────────────────────────
  useEffect(() => {
    if (!auth.connected) {
      setRepos([]);
      return;
    }

    // For Bitbucket, wait until a workspace is selected
    if (provider === 'bitbucket' && !workspace) {
      setRepos([]);
      return;
    }

    const cacheKey = `repos-${provider}-${workspace || 'default'}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRepos(parsed);
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached repositories:', e);
      }
    }

    let mounted = true;
    setReposLoading(true);
    (async () => {
      try {
        const res = await invoke('getRepositories', {
          provider,
          workspace,
          page: 1,
          perPage: 50,
        });
        if (!mounted) return;
        const fetchedRepos = Array.isArray(res?.repositories)
          ? res.repositories
          : Array.isArray(res)
            ? res
            : [];
        setRepos(fetchedRepos);
        sessionStorage.setItem(cacheKey, JSON.stringify(fetchedRepos));
      } catch (e) {
        if (!mounted) return;
        setRepos([]);
      } finally {
        if (mounted) setReposLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [auth.connected, provider, workspace]);

  // ─── Post-message listener for OAuth success ──────────────────────────────
  useEffect(() => {
    const handleMessage = (event) => {
      // Handle generic completion or provider-specific legacy messages
      if (
        event.data?.type === 'OAUTH_COMPLETE' ||
        event.data?.type === 'GITHUB_CONNECTED' ||
        event.data?.type === 'BITBUCKET_CONNECTED' ||
        event.data?.type === 'SCA_AUTH_SUCCESS'
      ) {
        // If the payload contains a provider, ensure it matches the current one or refresh regardless
        const msgProvider = event.data?.payload?.provider || event.data?.provider;
        if (!msgProvider || msgProvider === provider) {
          refreshAuthStatus(provider);
          setConnecting(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  // ─── Polling fallback if connection is pending ────────────────────────────
  useEffect(() => {
    if (!connecting) return;

    let timeoutId = setTimeout(() => {
      console.log('OAuth polling timed out');
      setConnecting(false);
      setError('Authentication timed out. Please try again.');
    }, 60000); // 1 minute timeout

    const interval = setInterval(async () => {
      try {
        const status = await invoke('getGitStatus', { provider });
        if (status.connected) {
          setAuth({
            connected: true,
            loading: false,
            username: status.username || (provider === 'bitbucket' ? 'Bitbucket User' : 'GitHub User')
          });
          setConnecting(false);
          clearInterval(interval);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('Error during polling:', err);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [connecting, provider]);

  // ─── Connect logic (OAuth flow) ───────────────────────────────────────────
  async function handleConnectGit(targetProvider) {
    setProvider(targetProvider);
    setConnecting(true);
    setError(null);
    try {
      const data = await invoke('getGitAuthUrl', { provider: targetProvider });
      console.log('getGithubAuthUrl response:', data);
      const { authUrl } = data;
      if (authUrl) {
        // Forge Custom UI sandboxes window.open — use router.open to open in a
        // new browser tab. The callback page auto-closes itself after OAuth;
        // the polling interval below detects the new connected state.
        await router.open(authUrl);
      } else {
        throw new Error('No authUrl returned from backend');
      }
    } catch (e) {
      console.error('handleConnectGit failed:', e);
      setError(`Failed to start OAuth: ${e.message || String(e)}`);
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setConfirmDisconnect(false);
    try {
      await invoke('disconnect', { provider });
      await refreshAuthStatus(provider);
    } catch (e) {
      setError(e?.message || String(e));
    }
  }

  // ─── Run solve ─────────────────────────────────────────────────────────────
  async function runSolve() {
    setError(null);
    setWarning(null);
    setResult(null);
    setRunning(true);
    try {
      const res = await invoke('solveTask', { provider, repoUrl, task });
      setResult(res);
    } catch (e) {
      const msg = e?.payload?.error || e?.message || String(e);
      setError(msg);
      if (e?.status === 401) {
        setAuth({ connected: false, loading: false });
      }
    } finally {
      setRunning(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const providerOptions = providers.map((p) => ({ label: p.name, value: p.id }));
  const providerOption = providerOptions.find((o) => o.value === provider) || null;
  const canRun = !running && !!repoUrl && !!task && !!auth.connected;

  if (auth.loading) {
    return (
      <div className="oliver-root" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="oliver-root">
      <header className="oliver-header">
        <div className="oliver-inline oliver-spread">
          <div className="oliver-branding">
            <div className="oliver-logo-badge">OA</div>
            <Heading size="medium">OliverAI</Heading>
          </div>
          {auth.connected && (
            confirmDisconnect ? (
              <div className="oliver-inline">
                <Button className="oliver-btn-warning" appearance="warning" onClick={handleDisconnect}>Confirm</Button>
                <Button className="oliver-btn-primary" appearance="subtle" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="oliver-inline">
                <div style={{ marginRight: '8px' }}>
                  <Lozenge appearance="success" isBold>Connected as {auth.username}</Lozenge>
                </div>
                <Button className="oliver-btn-warning" appearance="subtle" onClick={handleDisconnect}>Disconnect</Button>
              </div>
            )
          )}
        </div>
      </header>

      <main className="oliver-container oliver-fade-in">
        <div className="oliver-stack">

          {!auth.connected ? (
            /* Connect Panel */
            <div className="oliver-card oliver-hero">
              <div className="oliver-stack">
                <Heading size="large">Welcome to OliverAI</Heading>
                <p>
                  Connect your Git account to start automating your Jira tasks with AI.
                  We'll help you fix bugs and implement features directly in your codebase.
                </p>

                <div className="oliver-stack" style={{ maxWidth: '320px', margin: '0 auto', width: '100%' }}>
                  <LoadingButton
                    className="oliver-btn-primary"
                    appearance="primary"
                    onClick={() => handleConnectGit('github')}
                    isLoading={connecting && provider === 'github'}
                    isDisabled={connecting}
                    shouldFitContainer
                  >
                    Connect GitHub
                  </LoadingButton>

                  <LoadingButton
                    className="oliver-btn-warning"
                    appearance="default"
                    onClick={() => handleConnectGit('bitbucket')}
                    isLoading={connecting && provider === 'bitbucket'}
                    isDisabled={connecting}
                    shouldFitContainer
                  >
                    Connect Bitbucket
                  </LoadingButton>
                </div>

                <p style={{ fontSize: '11px', marginTop: '16px' }}>
                  OAuth is handled securely. We only access the repositories you authorize.
                </p>
              </div>
            </div>
          ) : (
            /* Main Dashboard */
            <>
              {/* Configuration Section */}
              <div className="oliver-card">
                <div className="oliver-stack">
                  <Heading size="small">Configuration</Heading>

                  <div className="oliver-inline oliver-spread" style={{ alignItems: 'flex-end' }}>
                    <div className="oliver-field-group" style={{ flex: 1, minWidth: '240px' }}>
                      <label className="oliver-label" htmlFor="provider">Git Provider</label>
                      <Select
                        inputId="provider"
                        value={providerOption}
                        options={providerOptions}
                        onChange={(opt) => { if (opt?.value) setProvider(opt.value); }}
                        placeholder="Select provider"
                      />
                    </div>
                  </div>

                  {provider === 'bitbucket' && (
                    <div className="oliver-field-group">
                      <label className="oliver-label" htmlFor="workspaceSelect">Workspace</label>
                      <Select
                        inputId="workspaceSelect"
                        value={(() => {
                          const matched = workspaces.find((w) => w.slug === workspace);
                          if (matched) return { label: matched.name || matched.slug, value: workspace };
                          if (workspace) return { label: workspace, value: workspace };
                          return null;
                        })()}
                        options={workspaces.map((w) => ({
                          label: w.name || w.slug,
                          value: w.slug,
                        }))}
                        onChange={(opt) => {
                          if (opt?.value && opt.value !== workspace) {
                            setWorkspace(opt.value);
                            setRepoUrl('');
                          }
                        }}
                        placeholder={workspacesLoading ? 'Loading workspaces...' : 'Select workspace...'}
                        isLoading={workspacesLoading}
                      />
                    </div>
                  )}

                  <div className="oliver-field-group">
                    <label className="oliver-label" htmlFor="repoSelect">Repository</label>
                    <Select
                      inputId="repoSelect"
                      value={(() => {
                        const toCloneUrl = (r) => r.cloneUrl || (r.htmlUrl?.endsWith('.git') ? r.htmlUrl : `${r.htmlUrl}.git`);
                        const matched = repos.find((r) => toCloneUrl(r) === repoUrl);
                        if (matched) return { label: matched.fullName || `${matched.owner}/${matched.name}`, value: repoUrl };
                        if (repoUrl) return { label: repoUrl, value: repoUrl };
                        return null;
                      })()}
                      options={repos.map((r) => ({
                        label: r.fullName || `${r.owner}/${r.name}`,
                        value: r.cloneUrl || (r.htmlUrl?.endsWith('.git') ? r.htmlUrl : `${r.htmlUrl}.git`),
                      }))}
                      onChange={(opt) => opt?.value && setRepoUrl(opt.value)}
                      placeholder={reposLoading ? 'Loading repositories...' : 'Select repository...'}
                      isLoading={reposLoading}
                    />
                    <div style={{ marginTop: '8px' }}>
                      <Textfield
                        id="repoUrl"
                        name="repoUrl"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="Or enter URL manually: https://github.com/acme/project"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Section */}
              <div className="oliver-card">
                <div className="oliver-stack">
                  <Heading size="small">Instruction</Heading>
                  <div className="oliver-field-group">
                    <label className="oliver-label" htmlFor="task">What should OliverAI do?</label>
                    <TextArea
                      id="task"
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      minimumRows={6}
                      placeholder="Describe the task in detail..."
                    />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <LoadingButton
                      className="oliver-btn-primary"
                      appearance="primary"
                      onClick={runSolve}
                      isDisabled={!canRun}
                      isLoading={running}
                    >
                      Run OliverAI
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Feedback & Results */}
          {error && (
            <SectionMessage title="Operation Failed" appearance="error">
              {error}
            </SectionMessage>
          )}

          {warning && (
            <SectionMessage title="Note" appearance="warning">
              {warning}
            </SectionMessage>
          )}

          {result && (
            <div className="oliver-card oliver-fade-in">
              <div className="oliver-stack">
                <Heading size="small">Agent Report</Heading>
                <div className="oliver-result-pre">
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
