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
import { Box, Inline, Stack, xcss } from '@atlaskit/primitives';

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
  const [provider, setProvider] = useState('github');
  const [providers, setProviders] = useState([
    { id: 'github', name: 'GitHub' },
    { id: 'bitbucket', name: 'Bitbucket' },
  ]);
  const [repoUrl, setRepoUrl] = useState('');
  const [task, setTask] = useState('');

  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);

  const [auth, setAuth] = useState({ connected: false, loading: true });
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  const cloudId = useMemo(() => ctx?.cloudId || ctx?.extension?.cloudId, [ctx]);
  const accountId = useMemo(() => ctx?.accountId || ctx?.extension?.accountId, [ctx]);

  // ─── Auth check — checks for stored token ──────────────────────────────────
  async function refreshAuthStatus() {
    setAuth((a) => ({ ...a, loading: true }));
    try {
      console.log('Invoking getGithubStatus...');
      const { data } = await invoke('getGithubStatus');
      console.log('GitHub Status:', data);
      setAuth({
        connected: !!data.connected,
        loading: false,
        username: 'GitHub User' // Placeholder since status only returns true/false now
      });
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
          if (!res.providers.find((p) => p.id === provider)) {
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

  // ─── Check auth on mount ──────────────────────────────────
  useEffect(() => {
    refreshAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load repositories once connected ─────────────────────────────────────
  useEffect(() => {
    if (!auth.connected) {
      setRepos([]);
      return;
    }

    const cacheKey = `repos-${provider}`;
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
  }, [auth.connected, provider]);

  // ─── Post-message listener for OAuth success ──────────────────────────────
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'GITHUB_CONNECTED') {
        refreshAuthStatus();
        setConnecting(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const status = await invoke('getGithubStatus');
        if (status.connected) {
          setAuth({
            connected: true,
            loading: false,
            username: status.username || 'GitHub User'
          });
          setConnecting(false);
          clearInterval(interval);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error('Error during polling:', err);
        // We don't stop the interval on a single error, 
        // but the timeout will eventually catch it.
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [connecting]);

  // ─── Connect logic (OAuth flow) ───────────────────────────────────────────
  async function handleConnectGit(targetProvider) {
    if (targetProvider !== 'github') {
      setError("Only GitHub is currently supported in this architecture.");
      return;
    }

    setConnecting(true);
    setError(null);
    try {
      const { authUrl } = await invoke('getGithubAuthUrl');
      console.log(`authUrl: ${authUrl}`)
      if (authUrl) {
        // Use window.open (popup) instead of router.open so that window.opener
        // is set in the callback page, allowing postMessage back to this panel.
        const popup = window.open(authUrl, 'github_oauth', 'popup,width=620,height=720,left=200,top=100');
        if (!popup) {
          // Popup was blocked – fall back to same-tab navigation.
          window.location.href = authUrl;
        }
      }
    } catch (e) {
      console.error('handleConnectGit failed:', e);
      setError(`Failed to start OAuth: ${e.message || String(e)}`);
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Are you sure you want to disconnect?')) return;
    try {
      await invoke('disconnect');
      await refreshAuthStatus();
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

  // ─── Styles ────────────────────────────────────────────────────────────────
  const headerStyles = xcss({
    padding: 'space.300',
    paddingBottom: 'space.200',
    backgroundColor: 'elevation.surface.raised',
    borderBottomWidth: 'border.width',
    borderBottomStyle: 'solid',
    borderBottomColor: 'color.border',
  });

  const cardStyles = xcss({
    backgroundColor: 'elevation.surface',
    borderRadius: 'border.radius.200',
    padding: 'space.300',
    borderWidth: 'border.width',
    borderStyle: 'solid',
    borderColor: 'color.border',
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  const providerOptions = providers.map((p) => ({ label: p.name, value: p.id }));
  const providerOption = providerOptions.find((o) => o.value === provider) || providerOptions[0];
  const canRun = !running && !!repoUrl && !!task && !!auth.connected;

  if (auth.loading) {
    return (
      <Box xcss={xcss({ padding: 'space.500', textAlign: 'center' })}>
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <Box className="oliver-root">
      <Box xcss={headerStyles}>
        <Inline alignBlock="center" spread="space-between">
          <Heading size="medium">OliverAI</Heading>
          {auth.connected && <Button appearance="subtle" onClick={handleDisconnect}>Disconnect</Button>}
        </Inline>
      </Box>

      <Box xcss={xcss({ padding: 'space.300' })} className="oliver-content">
        <Stack space="space.300">

          {!auth.connected ? (
            /* Connect Panel */
            <Box xcss={cardStyles}>
              <Stack space="space.200">
                <Heading size="small">Connect to OliverAI</Heading>
                <SectionMessage appearance="info">
                  To use this add-on, you need to connect your Git account.
                </SectionMessage>

                <Stack space="space.200">
                  <LoadingButton
                    appearance="primary"
                    onClick={() => handleConnectGit('github')}
                    isLoading={connecting && provider === 'github'}
                    isDisabled={connecting}
                    shouldFitContainer
                  >
                    Connect GitHub
                  </LoadingButton>

                  <LoadingButton
                    appearance="default"
                    onClick={() => handleConnectGit('bitbucket')}
                    isLoading={connecting && provider === 'bitbucket'}
                    isDisabled={connecting}
                    shouldFitContainer
                  >
                    Connect Bitbucket
                  </LoadingButton>
                </Stack>

                <Box as="p" xcss={xcss({ fontSize: 'font.size.075', color: 'color.text.subtle', textAlign: 'center' })}>
                  OAuth is handled securely by the SCA API.
                </Box>
              </Stack>
            </Box>
          ) : (
            /* Main Dashboard */
            <>
              {/* Provider Selection Row */}
              <Box xcss={cardStyles} className="oliver-card">
                <Stack space="space.200">
                  <Inline alignBlock="center" spread="space-between" shouldWrap>
                    <Stack space="space.050">
                      <Box as="span" xcss={xcss({ color: 'color.text.subtle', fontSize: 'font.size.075' })}>
                        Git provider
                      </Box>
                      <Box xcss={xcss({ minWidth: '240px' })} className="oliver-field">
                        <Select
                          inputId="provider"
                          value={providerOption}
                          options={providerOptions}
                          onChange={(opt) => { if (opt?.value) setProvider(opt.value); }}
                          placeholder="Select provider"
                        />
                      </Box>
                    </Stack>
                    <Lozenge appearance="success" isBold>Connected</Lozenge>
                  </Inline>
                </Stack>
              </Box>

              {/* Task Section */}
              <Box xcss={cardStyles} className="oliver-card">
                <Stack space="space.200">
                  <Stack space="space.075">
                    <Box as="label" htmlFor="repoSelect" xcss={xcss({ fontSize: 'font.size.075', fontWeight: 'font.weight.semibold' })}>
                      Repository
                    </Box>
                    <Box className="oliver-field">
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
                    </Box>
                    <Box as="span" xcss={xcss({ color: 'color.text.subtle', fontSize: 'font.size.050' })}>
                      Or enter URL manually:
                    </Box>
                    <Textfield
                      id="repoUrl"
                      name="repoUrl"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="e.g. https://github.com/acme/project"
                    />
                  </Stack>

                  <Stack space="space.075">
                    <Box as="label" htmlFor="task" xcss={xcss({ fontSize: 'font.size.075', fontWeight: 'font.weight.semibold' })}>
                      Task Description
                    </Box>
                    <Box className="oliver-field">
                      <TextArea
                        id="task"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        minimumRows={6}
                        placeholder="Describe what needs to be fixed or implemented..."
                      />
                    </Box>
                  </Stack>
                </Stack>
              </Box>

              <LoadingButton
                appearance="primary"
                onClick={runSolve}
                isDisabled={!canRun}
                shouldFitContainer
                isLoading={running}
              >
                Run OliverAI
              </LoadingButton>
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
            <Box xcss={cardStyles} className="oliver-card">
              <Stack space="space.150">
                <Heading size="small">Agent report</Heading>
                <Box
                  as="pre"
                  xcss={xcss({
                    padding: 'space.150',
                    backgroundColor: 'elevation.surface.sunken',
                    borderRadius: 'border.radius.100',
                    overflow: 'auto',
                    fontFamily: 'font.family.code',
                    fontSize: 'font.size.075',
                    whiteSpace: 'pre-wrap',
                  })}
                >
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </Box>
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export default App;
