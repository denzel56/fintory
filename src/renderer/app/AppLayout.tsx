import {
  AppShell,
  Badge,
  Burger,
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
    id: 'overview',
    label: 'Overview',
    description: 'Future income, expenses, and trend summaries.',
  },
  {
    id: 'import',
    label: 'Import',
    description: 'Select CSV exports and review import history.',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Search, filter, and categorize imported transactions.',
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Manage editable spending categories.',
  },
  {
    id: 'project',
    label: 'Project',
    description: 'Create, open, or close a local project.',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Future app and project preferences.',
  },
  {
    id: 'about',
    label: 'About',
    description: 'Version, privacy, and workflow notes.',
  },
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
          <Badge variant="light">Local-first MVP</Badge>
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
        {children}
      </AppShell.Main>
    </AppShell>
  )
}
