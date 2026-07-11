# Deploy to Production Workflow

This workflow automates the deployment of the `khora-web` application to Vercel upon pushing to the `main` branch.
This automates the previously manual process executed via the local terminal (using `npx vercel --prod`), effectively completing the CI/CD pipeline allowing `post-deploy-smoke.yml` to trigger automatically off the deployment status.

## Required Secrets

For this workflow to function correctly, the following secrets must be properly configured in the GitHub repository's secrets settings:

*   **`VERCEL_TOKEN`**: A personal access token from Vercel used to authenticate the deployment.
*   **`VERCEL_ORG_ID`**: The Vercel organization ID where the project is hosted.
*   **`VERCEL_PROJECT_ID`**: The unique project ID for `khora-web` in Vercel.

If any of these secrets are missing, the workflow will fail to deploy to Vercel but won't prevent pushing to `main`.

## Race Conditions Note

If a manual deployment via the Vercel CLI (`npx vercel --prod`) is run simultaneously with this GitHub Action workflow, both deployments can coexist as there are no locks enforced by Vercel. It is recommended to rely solely on the automated GitHub Actions deployment. If manual deployments are performed, their results will not trigger the post-deploy smoke tests unless a manual GitHub deployment is also simulated.
