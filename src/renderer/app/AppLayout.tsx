import {
  AppShell,
  Badge,
  Burger,
  Card,
  Group,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import type { PropsWithChildren } from 'react'
import type { AppPageId } from './navigation'

type NavigationItem = {
  id: AppPageId
  label: string
  description: string
}

type AppLayoutProps = PropsWithChildren<{
  activePage: AppPageId
  onPageChange: (pageId: AppPageId) => void
}>

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'A quick overview of income, expenses, and trends.',
  },
  {
    id: 'import',
    label: 'CSV Import',
    description: 'Bring in bank statement exports and avoid duplicates.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Search, filter, and categorize imported transactions.',
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Keep a simple set of editable spending categories.',
  },
  {
    id: 'about',
    label: 'Settings / About',
    description: 'Review local-first boundaries and future app settings.',
  },
]

const workflowSteps = [
  'Create a local project',
  'Import bank CSV exports',
  'Review and categorize transactions',
  'Understand spending history',
]

export function AppLayout({
  activePage,
  children,
  onPageChange,
}: AppLayoutProps) {
  const [mobileOpened, { close: closeMobileNavigation, toggle }] =
    useDisclosure(false)

  const handlePageChange = (pageId: AppPageId) => {
    onPageChange(pageId)
    closeMobileNavigation()
  }

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{
        width: 320,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="xl"
    >
      <AppShell.Header px="lg">
        <Group h="100%" justify="space-between">
          <Group gap="sm">
            <Burger
              aria-label="Toggle navigation"
              hiddenFrom="sm"
              opened={mobileOpened}
              size="sm"
              onClick={toggle}
            />
            <ThemeIcon radius="md" size="lg" variant="gradient">
              F
            </ThemeIcon>
            <div>
              <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                Local finance archive
              </Text>
              <Title order={1} size="h3">
                Fintory
              </Title>
            </div>
          </Group>
          <Badge variant="light">MVP shell</Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {navigationItems.map((item) => (
            <NavLink
              active={item.id === activePage}
              description={item.description}
              key={item.id}
              label={item.label}
              variant="light"
              onClick={() => handlePageChange(item.id)}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="xl">
          <Card bg="blue-light" padding="xl" radius="lg" withBorder>
            <Stack gap="sm">
              <Text c="blue" fw={700} size="xs" tt="uppercase">
                MVP shell
              </Text>
              <Title maw={760} order={2} size="3rem">
                Build your private financial history from bank CSV files.
              </Title>
              <Text c="dimmed" maw={820} size="lg">
                Fintory will help create a local project, import statement
                exports, preserve history, and explore spending without cloud
                sync, telemetry, or bank API connections.
              </Text>
            </Stack>
          </Card>

          <Group align="stretch" grow preventGrowOverflow={false}>
            {children}

            <Card miw={280} padding="xl" radius="lg" withBorder>
              <Stack gap="md">
                <Text c="dimmed" fw={700} size="xs" tt="uppercase">
                  Primary workflow
                </Text>
                <Stack component="ol" gap="md" m={0} pl="md">
                  {workflowSteps.map((step) => (
                    <Text component="li" fw={600} key={step}>
                      {step}
                    </Text>
                  ))}
                </Stack>
              </Stack>
            </Card>
          </Group>
        </Stack>
      </AppShell.Main>
    </AppShell>
  )
}
