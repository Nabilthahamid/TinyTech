import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  // Get the access token from the URL
  const access_token = url.searchParams.get("access_token");
  const refresh_token = url.searchParams.get("refresh_token");
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  if (error) {
    // Redirect to error page if there's an authentication error
    throw redirect(
      302,
      `/auth/auth-code-error?error=${encodeURIComponent(
        error_description || error
      )}`
    );
  }

  if (access_token && refresh_token) {
    // Redirect to home page after successful authentication
    throw redirect(302, "/");
  }

  // If no tokens, redirect to sign in
  throw redirect(302, "/auth/signin");
};
