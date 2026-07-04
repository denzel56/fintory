import {
  ActionIcon,
  Alert,
  Button,
  Card,
  ColorInput,
  ColorSwatch,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import type { CategoryDto } from '../../../shared/types/category'
import {
  validateCreateCategoryInput,
  validateUpdateCategoryInput,
} from '../../../shared/validation/category'

type CategoriesLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly categories: readonly CategoryDto[] }
  | { readonly status: 'error'; readonly message: string }

type CategoryFormValues = {
  readonly color: string
  readonly name: string
}

type CategoryFormErrors = Partial<Record<keyof CategoryFormValues, string>>

type CategoryAction = 'create' | 'delete' | 'refresh' | 'update'

const defaultFormValues: CategoryFormValues = {
  color: '#228be6',
  name: '',
}

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

const getCategoryFormErrors = (
  validationResult: ReturnType<
    typeof validateCreateCategoryInput | typeof validateUpdateCategoryInput
  >,
): CategoryFormErrors => {
  if (validationResult.ok) {
    return {}
  }

  if (validationResult.code === 'invalid-category-color') {
    return { color: validationResult.message }
  }

  return { name: validationResult.message }
}

export function CategoriesPage() {
  const [categoriesLoadState, setCategoriesLoadState] = useState<CategoriesLoadState>({
    status: 'loading',
  })
  const [categoryAction, setCategoryAction] = useState<CategoryAction | null>(null)
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<CategoryFormValues>(defaultFormValues)
  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({})
  const [editingCategory, setEditingCategory] = useState<CategoryDto | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryDto | null>(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)

  const loadCategories = async (action: CategoryAction | null = 'refresh') => {
    if (action) {
      setCategoryAction(action)
    }

    setCategoriesLoadState({ status: 'loading' })
    setCategoriesLoadState(await loadCategoriesState())
    setCategoryAction(null)
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

  const categories =
    categoriesLoadState.status === 'loaded' ? categoriesLoadState.categories : []
  const isLoading = categoriesLoadState.status === 'loading'
  const isActionRunning = categoryAction !== null
  const isEditing = editingCategory !== null

  const resetForm = () => {
    setFormValues(defaultFormValues)
    setFormErrors({})
    setEditingCategory(null)
  }

  const openCreateModal = () => {
    resetForm()
    setCategoryMessage(null)
    setIsFormModalOpen(true)
  }

  const openEditModal = (category: CategoryDto) => {
    setEditingCategory(category)
    setFormValues({ color: category.color, name: category.name })
    setFormErrors({})
    setCategoryMessage(null)
    setIsFormModalOpen(true)
  }

  const closeFormModal = () => {
    setIsFormModalOpen(false)
    resetForm()
  }

  const handleSaveCategory = async () => {
    if (!window.fintory) {
      setCategoryMessage('The Electron preload bridge is not available in this runtime.')
      return
    }

    setCategoryAction(editingCategory ? 'update' : 'create')
    setCategoryMessage(null)

    try {
      if (editingCategory) {
        const validationResult = validateUpdateCategoryInput({
          ...formValues,
          id: editingCategory.id,
        })

        if (!validationResult.ok) {
          setFormErrors(getCategoryFormErrors(validationResult))
          return
        }

        const result = await window.fintory.categories.update(validationResult.value)

        if (result.ok) {
          closeFormModal()
          setCategoryMessage('Category updated.')
          await loadCategories(null)
        } else {
          setCategoryMessage(result.message)
        }

        return
      }

      const validationResult = validateCreateCategoryInput(formValues)

      if (!validationResult.ok) {
        setFormErrors(getCategoryFormErrors(validationResult))
        return
      }

      const result = await window.fintory.categories.create(validationResult.value)

      if (result.ok) {
        closeFormModal()
        setCategoryMessage('Category created.')
        await loadCategories(null)
      } else {
        setCategoryMessage(result.message)
      }
    } catch {
      setCategoryMessage('Category could not be saved right now.')
    } finally {
      setCategoryAction(null)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) {
      return
    }

    if (!window.fintory) {
      setCategoryMessage('The Electron preload bridge is not available in this runtime.')
      return
    }

    setCategoryAction('delete')
    setCategoryMessage(null)

    try {
      const result = await window.fintory.categories.delete({ id: deletingCategory.id })

      if (result.ok) {
        setDeletingCategory(null)
        setCategoryMessage('Category deleted. Related transactions were uncategorized.')
        await loadCategories(null)
      } else {
        setCategoryMessage(result.message)
      }
    } catch {
      setCategoryMessage('Category could not be deleted right now.')
    } finally {
      setCategoryAction(null)
    }
  }

  const categoryRows = categories.map((category) => (
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
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <ActionIcon
            aria-label={`Edit ${category.name}`}
            disabled={isActionRunning}
            variant="light"
            onClick={() => openEditModal(category)}
          >
            ✎
          </ActionIcon>
          <ActionIcon
            aria-label={`Delete ${category.name}`}
            color="red"
            disabled={isActionRunning}
            variant="light"
            onClick={() => setDeletingCategory(category)}
          >
            ×
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Stack gap={4}>
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              Categories
            </Text>
            <Title order={3}>Category management</Title>
          </Stack>
          <Group gap="sm">
            <Button disabled={isActionRunning} onClick={openCreateModal}>
              Add category
            </Button>
            <Button
              loading={categoryAction === 'refresh' || isLoading}
              variant="light"
              onClick={() => void loadCategories()}
            >
              Refresh
            </Button>
          </Group>
        </Group>

        <Text c="dimmed">
          Manage the local category set used to organize imported transactions.
          Deleting a category uncategorizes related transactions.
        </Text>

        {categoryMessage ? <Alert title="Category action">{categoryMessage}</Alert> : null}

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
                Add a category to start organizing future transactions.
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
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{categoryRows}</Table.Tbody>
          </Table>
        ) : null}
      </Stack>

      <Modal
        opened={isFormModalOpen}
        title={isEditing ? 'Edit category' : 'Add category'}
        onClose={closeFormModal}
      >
        <Stack gap="md">
          <TextInput
            disabled={isActionRunning}
            error={formErrors.name}
            label="Category name"
            placeholder="Groceries"
            value={formValues.name}
            onChange={(event) => {
              setFormValues({ ...formValues, name: event.currentTarget.value })
              setFormErrors({ ...formErrors, name: undefined })
            }}
          />
          <ColorInput
            disabled={isActionRunning}
            error={formErrors.color}
            label="Category color"
            value={formValues.color}
            onChange={(color) => {
              setFormValues({ ...formValues, color })
              setFormErrors({ ...formErrors, color: undefined })
            }}
          />
          <Group justify="flex-end">
            <Button disabled={isActionRunning} variant="subtle" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button
              loading={categoryAction === 'create' || categoryAction === 'update'}
              onClick={handleSaveCategory}
            >
              {isEditing ? 'Save changes' : 'Create category'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deletingCategory !== null}
        title="Delete category"
        onClose={() => setDeletingCategory(null)}
      >
        <Stack gap="md">
          <Text>
            Delete {deletingCategory?.name}? Related transactions will be kept and
            set to uncategorized.
          </Text>
          <Group justify="flex-end">
            <Button
              disabled={isActionRunning}
              variant="subtle"
              onClick={() => setDeletingCategory(null)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={categoryAction === 'delete'}
              onClick={handleDeleteCategory}
            >
              Delete category
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  )
}
