// In a React component (Next.js page)

import { parse } from "cookie"; // If needed
import { GitRepository } from "../features/github_api/github_api";

export async function getServerSideProps(context: any) {
  const cookies = context.req.cookies; // Access cookies from the request
  const sessionToken = cookies["accessToken"]; // Reads HttpOnly cookie

  if (sessionToken) {
    // Validate token...
    console.log("Session Token (getServerSideProps):", sessionToken);
    // You can fetch user data here and pass it as props
    return { props: { accessToken: sessionToken } };
  }

  return { props: { user: null } };
}

// Button triggering navigation:
function LoginPageWithButton({ accessToken }: { accessToken: string }) {
  const handleLogin = () => {
    // Redirect the entire browser window
    window.location.href = "http://localhost:5001/v1/auth/login";
    // Make sure this URL matches what your Bun server expects
    // window.location.href = '/v1/auth/login';
  };

  const getRepos = async () => {
    const result = await GitRepository.getUserRepos("GitHub", accessToken);
    console.log(result);
  };

  async function authenticateUser() {
    console.log(document.cookie);
  }

  return (
    <div>
      <h1>Login</h1>
      <div>
        <button onClick={handleLogin}>
          <h1>Login with GitHub (Using Button)</h1>
        </button>
      </div>
      <div>
        <button onClick={getRepos}>
          <h1>Get repos</h1>
        </button>
      </div>
    </div>
  );
}

export default LoginPageWithButton; // Or LoginPage
