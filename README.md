# Vortix

**Payment orchestration infrastructure for modern businesses.**

Vortix helps merchants manage payments across multiple providers from one place. It brings payment routing, transaction monitoring, risk controls, reconciliation, merchant APIs, and operational visibility into a single platform.

## What Vortix does

- **Multi-provider payment orchestration** — connect and manage supported payment providers through one control layer.
- **Payment routing** — route transactions through available providers based on configurable payment requirements.
- **Transaction monitoring** — track payment status, provider responses, and payment activity from one dashboard.
- **Risk controls** — identify transactions that require additional review before processing.
- **Reconciliation** — match provider payment outcomes with Vortix transaction records.
- **Merchant API access** — integrate Vortix into websites, applications, and backend systems.
- **Operational dashboard** — manage payments, provider readiness, API access, and transaction history.
- **Cross-platform access** — web/PWA with companion browser, mobile, and desktop clients in the project.

## Supported payment providers

Vortix currently includes integrations for:

- Paystack
- Flutterwave
- Monnify

Additional providers can be added through the provider integration layer.

## How it works

1. A merchant creates a Vortix account.
2. The merchant connects supported payment providers.
3. An application or merchant dashboard creates a payment through Vortix.
4. Vortix applies payment and risk rules before selecting an available provider.
5. The customer completes payment through the provider's hosted checkout.
6. Vortix confirms the provider result and updates the merchant's transaction record.
7. Payment activity can then be monitored and reconciled from the Vortix dashboard.

## Platforms

Vortix is designed to be accessible across multiple surfaces:

- **Web application / PWA**
- **Browser extension**
- **Android and iOS companion application**
- **Windows, macOS, and Linux desktop companion**

The web application is the primary merchant operations interface.

## Security

Vortix is designed around server-side payment integrations and provider-hosted checkout experiences.

Key principles include:

- sensitive payment-provider credentials are kept server-side;
- customers complete payment through supported hosted checkout flows;
- payment results are independently confirmed before settlement is recorded;
- merchant data is isolated by account;
- merchant API access can be revoked;
- transaction and payment activity is auditable.

Vortix does not ask merchants to expose payment-provider secret credentials in client-side applications.

## Getting started

### Web application

Visit:

**https://vortix-alpha.vercel.app**

Create an account to access a merchant workspace and dashboard.

### API

Public API documentation is available from the application:

**https://vortix-alpha.vercel.app/docs**

Vortix API keys can be created from the merchant settings area for approved integrations.

## Repository

This repository contains the Vortix web application, API layer, payment-provider integrations, database migrations, browser extension, mobile client, desktop client, automated tests, and release workflows.

Developers contributing to Vortix should follow the repository documentation and keep private credentials outside source control.

## Project status

Vortix is under active commercial development. Payment-provider availability and platform distribution may vary while integrations, compliance requirements, and store releases are completed.

## Support

For project-related issues, use the GitHub Issues section of this repository.

---

© Vortix
