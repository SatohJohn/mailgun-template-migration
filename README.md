# mailgun-template-migration

This project was created using `bun init` in bun v1.0.25. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

This project is based on [mailgun-template-migration](https://github.com/paliwalvimal/mailgun-template-migration)

## Usage:
- This application has no dependencies.
- You must set below environments when you execute.

### Environment Variables:

```bash
MG_BASE_URL='https://api.mailgun.net/v3'    # Mailgun API base URL
MG_OLD_MAIL_DOMAIN='abc.com'                # Domain name under which template exists
MG_NEW_MAIL_DOMAIN='xyz.com'                # Domain name to which template needs to be copied or moved to
MG_API_KEY='xxxxxxxxxx'                     # Mailgun API Key
```

### Command:

```bash
bun index.ts [copy|move]
```

