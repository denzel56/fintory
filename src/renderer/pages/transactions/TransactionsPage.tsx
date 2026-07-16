import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import type {
  ListTransactionsPage,
  ListTransactionsQuery,
  TransactionDirection,
  TransactionDto,
  TransactionFiltersDto,
  TransactionSortDirection,
  TransactionSortField,
} from '../../../shared/types/transaction'

type TransactionsLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly page: ListTransactionsPage }
  | { readonly status: 'error'; readonly message: string }

type TransactionFiltersLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly filters: TransactionFiltersDto }
  | { readonly status: 'error'; readonly message: string }

type TransactionsQueryState = Required<ListTransactionsQuery>

const defaultPageSize = 25

const defaultTransactionsQuery: TransactionsQueryState = {
  categoryId: null,
  direction: null,
  fromDate: null,
  page: 1,
  pageSize: defaultPageSize,
  search: null,
  sortDirection: 'desc',
  sortField: 'date',
  toDate: null,
}

const pageSizeOptions = [
  { value: '10', label: '10 per page' },
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
]

const sortFieldOptions: Array<{ readonly value: TransactionSortField; readonly label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'description', label: 'Description' },
]

const sortDirectionOptions: Array<{
  readonly value: TransactionSortDirection
  readonly label: string
}> = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
]

const directionFilterOptions: Array<{ readonly value: TransactionDirection; readonly label: string }> = [
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
]

const loadTransactionsState = async (
  query: TransactionsQueryState,
): Promise<TransactionsLoadState> => {
  if (!window.fintory) {
    return {
      status: 'error',
      message: 'The Electron preload bridge is not available in this runtime.',
    }
  }

  try {
    const result = await window.fintory.transactions.list(query)

    if (result.ok) {
      return { status: 'loaded', page: result.page }
    }

    return { status: 'error', message: result.message }
  } catch {
    return {
      status: 'error',
      message: 'Transactions could not be loaded right now.',
    }
  }
}

const loadTransactionFiltersState = async (): Promise<TransactionFiltersLoadState> => {
  if (!window.fintory) {
    return {
      status: 'error',
      message: 'The Electron preload bridge is not available in this runtime.',
    }
  }

  try {
    const result = await window.fintory.transactions.getFilters()

    if (result.ok) {
      return { status: 'loaded', filters: result.filters }
    }

    return { status: 'error', message: result.message }
  } catch {
    return {
      status: 'error',
      message: 'Transaction filters could not be loaded right now.',
    }
  }
}

const formatTransactionDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString()
}

const formatTransactionAmount = (transaction: TransactionDto): string => {
  const signedAmount = transaction.direction === 'expense' ? -transaction.amountMinor : transaction.amountMinor
  const amount = signedAmount / 100

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: transaction.currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${transaction.currency}`
  }
}

const getDirectionColor = (direction: TransactionDirection): 'green' | 'red' => {
  return direction === 'income' ? 'green' : 'red'
}

const getPageCount = (totalCount: number, pageSize: number): number => {
  return Math.max(1, Math.ceil(totalCount / pageSize))
}

export function TransactionsPage() {
  const [transactionsQuery, setTransactionsQuery] =
    useState<TransactionsQueryState>(defaultTransactionsQuery)
  const [searchInput, setSearchInput] = useState('')
  const [transactionMessage, setTransactionMessage] = useState<string | null>(null)
  const [updatingTransactionId, setUpdatingTransactionId] = useState<string | null>(null)
  const [transactionsLoadState, setTransactionsLoadState] = useState<TransactionsLoadState>({
    status: 'loading',
  })
  const [transactionFiltersLoadState, setTransactionFiltersLoadState] =
    useState<TransactionFiltersLoadState>({ status: 'loading' })

  useEffect(() => {
    let isMounted = true

    loadTransactionsState(transactionsQuery).then((nextTransactionsLoadState) => {
      if (isMounted) {
        setTransactionsLoadState(nextTransactionsLoadState)
      }
    })

    return () => {
      isMounted = false
    }
  }, [transactionsQuery])

  useEffect(() => {
    let isMounted = true

    loadTransactionFiltersState().then((nextTransactionFiltersLoadState) => {
      if (isMounted) {
        setTransactionFiltersLoadState(nextTransactionFiltersLoadState)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  const transactionsPage =
    transactionsLoadState.status === 'loaded' ? transactionsLoadState.page : null
  const transactions = transactionsPage?.transactions ?? []
  const totalCount = transactionsPage?.totalCount ?? 0
  const pageCount = getPageCount(totalCount, transactionsQuery.pageSize)
  const filters =
    transactionFiltersLoadState.status === 'loaded' ? transactionFiltersLoadState.filters : null
  const categoryFilterOptions =
    filters?.categories.map((category) => ({ value: category.id, label: category.name })) ?? []
  const isTransactionsLoading = transactionsLoadState.status === 'loading'
  const hasTransactions = transactions.length > 0
  const hasActiveFilters =
    Boolean(transactionsQuery.search) ||
    Boolean(transactionsQuery.fromDate) ||
    Boolean(transactionsQuery.toDate) ||
    Boolean(transactionsQuery.categoryId) ||
    Boolean(transactionsQuery.direction)

  const updateQuery = (partialQuery: Partial<TransactionsQueryState>) => {
    setTransactionsLoadState({ status: 'loading' })
    setTransactionsQuery((currentQuery) => ({
      ...currentQuery,
      ...partialQuery,
      page: partialQuery.page ?? 1,
    }))
  }

  const handleApplySearch = () => {
    updateQuery({ search: searchInput.trim() || null })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setTransactionMessage(null)
    setTransactionsLoadState({ status: 'loading' })
    setTransactionsQuery(defaultTransactionsQuery)
  }

  const refreshTransactions = async () => {
    setTransactionsLoadState({ status: 'loading' })
    setTransactionsLoadState(await loadTransactionsState(transactionsQuery))
  }

  const handleUpdateTransactionCategory = async (
    transactionId: string,
    categoryId: string | null,
  ) => {
    if (!window.fintory) {
      setTransactionMessage('The Electron preload bridge is not available in this runtime.')
      return
    }

    setUpdatingTransactionId(transactionId)
    setTransactionMessage(null)

    try {
      const result = await window.fintory.transactions.updateCategory({ categoryId, transactionId })

      if (result.ok) {
        setTransactionMessage(categoryId ? 'Transaction category updated.' : 'Transaction category cleared.')
        await refreshTransactions()
        return
      }

      setTransactionMessage(result.message)
    } catch {
      setTransactionMessage('Transaction category could not be updated right now.')
    } finally {
      setUpdatingTransactionId(null)
    }
  }

  const transactionRows = transactions.map((transaction) => (
    <Table.Tr key={transaction.id}>
      <Table.Td>{formatTransactionDate(transaction.transactionDate)}</Table.Td>
      <Table.Td>
        <Stack gap={2}>
          <Text fw={600}>{transaction.description}</Text>
          {transaction.merchant ? (
            <Text c="dimmed" size="sm">
              {transaction.merchant}
            </Text>
          ) : null}
        </Stack>
      </Table.Td>
      <Table.Td>
        <Select
          aria-label="Transaction category"
          clearable
          data={categoryFilterOptions}
          disabled={transactionFiltersLoadState.status !== 'loaded' || updatingTransactionId !== null}
          placeholder="Uncategorized"
          size="xs"
          value={transaction.category?.id ?? null}
          onChange={(value) => handleUpdateTransactionCategory(transaction.id, value || null)}
          rightSection={updatingTransactionId === transaction.id ? <Loader size="xs" /> : undefined}
        />
      </Table.Td>
      <Table.Td>
        <Badge color={getDirectionColor(transaction.direction)} variant="light">
          {transaction.direction}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text fw={700} ta="right">
          {formatTransactionAmount(transaction)}
        </Text>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Card padding="xl" radius="lg" withBorder>
      <Stack gap="lg">
        <Group align="flex-start" justify="space-between">
          <Stack gap={4}>
            <Text c="dimmed" fw={700} size="xs" tt="uppercase">
              Transactions
            </Text>
            <Title order={3}>Transaction browser</Title>
            <Text c="dimmed">
              Search, filter, sort, and page through imported local transactions.
            </Text>
          </Stack>
          <Button
            loading={isTransactionsLoading}
            variant="light"
            onClick={() => updateQuery({ page: transactionsQuery.page })}
          >
            Refresh
          </Button>
        </Group>

        {transactionFiltersLoadState.status === 'error' ? (
          <Alert color="yellow" title="Filters unavailable">
            {transactionFiltersLoadState.message}
          </Alert>
        ) : null}

        <Card padding="md" radius="md" withBorder>
          <Stack gap="md">
            <Group align="flex-end" grow>
              <TextInput
                label="Search"
                placeholder="Description or merchant"
                value={searchInput}
                onChange={(event) => setSearchInput(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleApplySearch()
                  }
                }}
              />
              <TextInput
                label="From date"
                type="date"
                value={transactionsQuery.fromDate ?? ''}
                onChange={(event) => updateQuery({ fromDate: event.currentTarget.value || null })}
              />
              <TextInput
                label="To date"
                type="date"
                value={transactionsQuery.toDate ?? ''}
                onChange={(event) => updateQuery({ toDate: event.currentTarget.value || null })}
              />
            </Group>

            <Group align="flex-end" grow>
              <Select
                clearable
                data={categoryFilterOptions}
                disabled={transactionFiltersLoadState.status === 'loading'}
                label="Category"
                placeholder="All categories"
                value={transactionsQuery.categoryId}
                onChange={(value) => updateQuery({ categoryId: value || null })}
              />
              <Select
                clearable
                data={directionFilterOptions}
                label="Direction"
                placeholder="All directions"
                value={transactionsQuery.direction}
                onChange={(value) =>
                  updateQuery({ direction: (value as TransactionDirection | null) ?? null })
                }
              />
              <Select
                data={sortFieldOptions}
                label="Sort by"
                value={transactionsQuery.sortField}
                onChange={(value) => updateQuery({ sortField: value as TransactionSortField })}
              />
              <Select
                data={sortDirectionOptions}
                label="Sort direction"
                value={transactionsQuery.sortDirection}
                onChange={(value) =>
                  updateQuery({ sortDirection: value as TransactionSortDirection })
                }
              />
            </Group>

            <Group justify="space-between">
              <Group>
                <Button variant="filled" onClick={handleApplySearch}>
                  Apply search
                </Button>
                <Button disabled={!hasActiveFilters} variant="subtle" onClick={handleResetFilters}>
                  Reset filters
                </Button>
              </Group>
              <Select
                data={pageSizeOptions}
                label="Page size"
                maw={160}
                value={String(transactionsQuery.pageSize)}
                onChange={(value) => updateQuery({ pageSize: Number(value ?? defaultPageSize) })}
              />
            </Group>
          </Stack>
        </Card>

        {transactionsLoadState.status === 'error' ? (
          <Alert color="red" title="Transactions unavailable">
            {transactionsLoadState.message}
          </Alert>
        ) : null}

        {transactionMessage ? (
          <Alert color="blue" title="Transaction update">
            {transactionMessage}
          </Alert>
        ) : null}

        <Card padding="md" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text c="dimmed" size="sm">
                {totalCount === 0
                  ? 'No matching transactions.'
                  : `${totalCount} transaction${totalCount === 1 ? '' : 's'} found.`}
              </Text>
              {isTransactionsLoading ? <Loader size="sm" /> : null}
            </Group>

            <Table.ScrollContainer minWidth={760}>
              <Table highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Direction</Table.Th>
                    <Table.Th ta="right">Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {hasTransactions ? (
                    transactionRows
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text c="dimmed" py="xl" ta="center">
                          {hasActiveFilters
                            ? 'No transactions match the current filters.'
                            : 'Import CSV files to see local transactions here.'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Group justify="space-between">
              <Text c="dimmed" size="sm">
                Page {transactionsQuery.page} of {pageCount}
              </Text>
              <Pagination
                disabled={isTransactionsLoading || pageCount <= 1}
                total={pageCount}
                value={transactionsQuery.page}
                onChange={(page) => updateQuery({ page })}
              />
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Card>
  )
}
