import {
  Alert,
  Button,
  Card,
  ColorSwatch,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import type { CategoryDto } from '../../../shared/types/category'

type CategoriesLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly categories: readonly CategoryDto[] }
  | { readonly status: 'error'; readonly message: string }

const getCategoryRows = (categories: readonly CategoryDto[]) =>
  categories.map((category) => (
    <Table.Tr key={category.id}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <ColorSwatch color={category.color} size={18} />
          <Text fw={600}>{category.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text c="dimmed" size="sm">
          {category.color}
        </Text>
      </Table.Td>
    </Table.Tr>
  ))

const loadCategoriesState = async (): Promise<CategoriesLoadState> => {
  if (!window.fintory) {
    return {
      status: 'error',
      message: 'The Electron preload bridge is not available in this runtime.',
    }
  }

  try {
    const result = await window.fintory.categories.list()

    if (result.ok) {
      return { status: 'loaded', categories: result.categories }
    }

    return { status: 'error', message: result.message }
  } catch {
    return {
      status: 'error',
      message: 'Categories could not be loaded right now.',
    }
  }
}

export function CategoriesPage() {
  const [categoriesLoadState, setCategoriesLoadState] = useState<CategoriesLoadState>({
    status: 'loading',
  })

  const loadCategories = async () => {
    setCategoriesLoadState({ status: 'loading' })
    setCategoriesLoadState(await loadCategoriesState())
  }

  useEffect(() => {
    let isMounted = true

    loadCategoriesState().then((nextCategoriesLoadState) => {
      if (isMounted) {
        setCategoriesLoadState(nextCategoriesLoadState)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const isLoading = categoriesLoadState.status === 'loading'
  const categories =
    categoriesLoadState.status === 'loaded' ? categoriesLoadState.categories : []

  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Stack gap={4}>
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              Categories
            </Text>
            <Title order={3}>Default categories</Title>
          </Stack>
          <Button loading={isLoading} variant="light" onClick={loadCategories}>
            Refresh
          </Button>
        </Group>

        <Text c="dimmed">
          New projects start with a small local category set. Editing will be added in a later phase.
        </Text>

        {categoriesLoadState.status === 'error' ? (
          <Alert color="yellow" title="Categories unavailable">
            {categoriesLoadState.message}
          </Alert>
        ) : null}

        {isLoading ? (
          <Group gap="sm">
            <Loader size="sm" />
            <Text c="dimmed" size="sm">
              Loading categories...
            </Text>
          </Group>
        ) : null}

        {categoriesLoadState.status === 'loaded' && categories.length === 0 ? (
          <Card bg="blue-light" padding="lg" radius="md" withBorder>
            <Stack gap={4}>
              <Text fw={700}>No categories found.</Text>
              <Text c="dimmed" size="sm">
                Create a new project to seed the default MVP categories.
              </Text>
            </Stack>
          </Card>
        ) : null}

        {categories.length > 0 ? (
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Color</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{getCategoryRows(categories)}</Table.Tbody>
          </Table>
        ) : null}
      </Stack>
    </Card>
  )
}
