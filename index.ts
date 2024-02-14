const MG_BASE_URL = process.env.MG_BASE_URL || 'https://api.mailgun.net/v3'
const MG_OLD_MAIL_DOMAIN = process.env.MG_OLD_MAIL_DOMAIN || null
const MG_NEW_MAIL_DOMAIN = process.env.MG_NEW_MAIL_DOMAIN || null
const MG_API_KEY = process.env.MG_API_KEY || null

interface TemplateResponse {
  template: {
    description: string
    version: {
      tag: string
      template: string
      headers: Record<string, string>
    }
  }
}

interface CreateTemplateResponse {
  message: string
  template: {
    name: string
    description: string
    template: string
    headers: Record<string, string>
  }
}

async function getTemplate(name: string): Promise<TemplateResponse | null> {
  try {
    const response = await fetch(`${MG_BASE_URL}/${MG_OLD_MAIL_DOMAIN}/templates/${name}?active=yes`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MG_API_KEY}`).toString('base64')}`,
      },
    })

    if (response.status === 200) {
      return response.json()
    }
    return null
  } catch (error) {
    console.error(error)
    return null
  }
}

async function createTemplate(
  name: string,
  description: string,
  template: string,
  headers: Record<string, string>,
): Promise<CreateTemplateResponse | null> {
  try {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('description', description)
    fd.append('template', template)
    fd.append('headers', JSON.stringify(headers))
    const response = await fetch(`${MG_BASE_URL}/${MG_NEW_MAIL_DOMAIN}/templates`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MG_API_KEY}`).toString('base64')}`,
      },
      body: fd,
    })

    if (response.status === 200) {
      const res = await response.json()
      if (res.message === 'template has been stored') {
        return res
      }
      return res
    }
    return null
  } catch (error) {
    console.error(error)
    return null
  }
}

async function deleteTemplate(name: string): Promise<boolean> {
  try {
    const response = await fetch(`${MG_BASE_URL}/${MG_OLD_MAIL_DOMAIN}/templates/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${MG_API_KEY}`).toString('base64')}`,
      },
    })

    if (response.status === 200 && (await response.json()).message === 'template has been deleted') {
      return true
    }
    return false
  } catch (error) {
    console.error(error)
    return false
  }
}

async function getAllTemplates(): Promise<string[]> {
  const templateNames: string[] = []
  const params = new URLSearchParams()

  console.log(`Fetching all templates under domain ${MG_OLD_MAIL_DOMAIN}`)

  while (true) {
    try {
      const response = await fetch(`${MG_BASE_URL}/${MG_OLD_MAIL_DOMAIN}/templates?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${MG_API_KEY}`).toString('base64')}`,
        },
      })

      if (response.status === 200) {
        const resp = await response.json()
        for (const item of resp.items) {
          templateNames.push(item.name)
        }

        if (resp.items.length > 0) {
          params.set('page', 'next')
          params.set('p', resp.items[resp.items.length - 1].name)
        } else {
          break
        }
      } else {
        break
      }
    } catch (error) {
      console.error(error)
      break
    }
  }

  return templateNames
}

async function migrateTemplate(operation: string): Promise<void> {
  const templateNames = await getAllTemplates()
  console.log(`Template(s) to ${operation}: ${templateNames.length > 0 ? templateNames : 'None'}`)

  for (const templateName of templateNames) {
    console.log(`Copying template ${templateName} to domain ${MG_NEW_MAIL_DOMAIN}`)
    const resp = await getTemplate(templateName)
    if (!resp) {
      console.log(`Failed to fetch template ${templateName} from old domain`)
      continue
    }

    const createdTemplate = await createTemplate(
      templateName,
      resp.template.description,
      resp.template.version.template,
      resp.template.version.headers,
    )
    console.log(
      createdTemplate
        ? `Template ${templateName} created in new domain`
        : `Failed to create template ${templateName} in new domain`,
    )

    if (createdTemplate && operation === 'move') {
      const result = await deleteTemplate(templateName)
      console.log(
        result
          ? `Template ${templateName} deleted from old domain`
          : `Failed to delete template ${templateName} from old domain`,
      )
    }
  }
}

if (process.argv.length !== 3) {
  console.log('Argument not found. Usage: bun index.ts [copy | move]')
  process.exit(1)
} else if (!MG_OLD_MAIL_DOMAIN || !MG_NEW_MAIL_DOMAIN || !MG_API_KEY) {
  console.log(
    `Environment variables MG_OLD_MAIL_DOMAIN, MG_NEW_MAIL_DOMAIN, and MG_API_KEY are required. Current values:\nMG_OLD_MAIL_DOMAIN: ${MG_OLD_MAIL_DOMAIN}\nMG_NEW_MAIL_DOMAIN: ${MG_NEW_MAIL_DOMAIN}\nMG_API_KEY: ${MG_API_KEY}`,
  )
  process.exit(1)
} else if (process.argv[2] !== 'copy' && process.argv[2] !== 'move') {
  console.log('Invalid argument. Usage: bun index.ts [copy | move]')
  process.exit(1)
} else {
  migrateTemplate(process.argv[2])
    .then(() => process.exit())
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
