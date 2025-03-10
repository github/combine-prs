# GitHub App Setup

This section goes into detail on how to use a [GitHub App](https://docs.github.com/en/developers/apps/getting-started-with-apps/about-apps) to generate a token that can be used to run the `combine-prs` Action.

## Why use a GitHub App?

GitHub Apps are more scalable than personal access tokens. They also have a higher rate limit than personal access tokens.

## Security Considerations

Using private keys from one GitHub App across multiple repositories carries inherent risk, especially if the GitHub App has `write` permissions for repository `contents`. This is because each repository where the app is installed can use the private key to perform actions as the GitHub App on any other repository where the app is installed. Another risk is that if one repository has weak security controls and the key is exposed, all repositories that have installed the app are at risk as well. Even if the private keys are different on each repository, all private keys allow the same access and are intended for redundancy rather than segregating access.

The exact same risks apply when using a GitHub (classic) PAT with `write` permissions for repository `contents`. The difference is that the PAT is tied to a user account, and the user account is likely to have access to many more repositories than the GitHub App (making it even less secure).

The ideal approach would be to use a fine-grained personal access token (tied to a bot/service account). Each PAT would then be scoped to a single repository. This would be more secure, but would also be more cumbersome to manage at scale.

## Setting up a GitHub App

Before we can write up the `combine-prs` Action, we need to create a GitHub App. You can do this by going to `Settings` > `Developer settings` > `GitHub Apps` > `New GitHub App`.

Follow along with the screenshots below to create a new GitHub App:

![new-github-app-1](assets/new-github-app-1.png)

Enter a unique name for your GitHub App, a meaningful description, and any link you want. Ensure you expire user authorization tokens.

![new-github-app-2](assets/new-github-app-2.png)

Keep all the defaults in the next section as indicated by the screenshot. The only thing you will want to do in this section is disable the `Webhook` option. Ensure `Active` is "unchecked".

![new-github-app-3](assets/new-github-app-3.png)

In this section, you will want to enable the following repository permissions:

- Commit statuses: `Read-only`
- Contents: `Read and write`
- Metadata: `Read-only`
- Pull requests: `Read and write`

Also ensure that you select `Only on this account` for the installation option.

Now you can go ahead and create your GitHub App!

## Configuring Secrets

In order for your `combine-prs` Action workflow to properly run, you will need to configure two secrets for your workflow using credentials from the GitHub App you just created.

### `APP_ID`

You can find your applications ID on the `General` page of your GitHub App. It will be listed as `App ID`.

![new-github-app-4](assets/new-github-app-4.png)

Make note of your `APP_ID` as we will use it shortly

### `PRIVATE_KEY`

You will now need to generate a private key for your GitHub App. This section will also be located on the `General` page of your GitHub App.

![new-github-app-5](assets/new-github-app-5.png)

> Note: When you generate a private key, it will download a `.pem` file. You will need to copy the contents of this file and paste it into your secret.

Make note of your `PRIVATE_KEY` as we will use it shortly.

### Setting Secrets

Now that you have the values of both your `APP_ID` and `PRIVATE_KEY`, you can go ahead and set them as secrets in your repository. Where you wish to run the `combine-prs` Action, go to `Settings` > `Secrets` > `New repository secret`. Create the following two secrets:

- `APP_ID`: The ID of your GitHub App
- `PRIVATE_KEY`: The private key of your GitHub App

## Setting up the `combine-prs` Action

Now that the GitHub App is set up and the secrets are configured, we can go ahead and set up the `combine-prs` Action. *Finally*!

The following open source [Action](https://github.com/marketplace/actions/use-app-token) helps to generate a GitHub App token for you which can then be passed into the `combine-prs` Action.

Here is the example workflow that you can use to run the `combine-prs` Action with a GitHub App:

```yaml
name: Combine PRs

on:
  schedule:
    - cron: '0 1 * * 3' # Wednesday at 01:00
  workflow_dispatch:

# The minimum permissions to run this workflow
permissions:
  contents: write
  pull-requests: write
  checks: read

jobs:
  combine-prs:
    runs-on: ubuntu-latest

    steps:
      - name: Use GitHub App Token
        uses: actions/create-github-app-token@eaddb9eb7e4226c68cf4b39f167c83e5bd132b3e # pin@v1.5.1
        id: app-token
        with:
          app-id: ${{ secrets.APP_ID }} # The ID of the GitHub App
          private-key: ${{ secrets.PRIVATE_KEY }} # The private key of the GitHub App

      - name: combine-prs
        uses: github/combine-prs@vX.X.X # where X.X.X is the latest version
        with:
          github_token: ${{ steps.app-token.outputs.token }} # A GitHub app token generated by the previous step
          labels: combined-pr
```
