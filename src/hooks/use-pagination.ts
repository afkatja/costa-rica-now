"use client"

import { useMemo } from "react"

export interface UsePaginationProps {
  currentPage: number
  totalCount: number
  itemsPerPage: number
}

export interface UsePaginationReturn {
  totalPages: number
  startIndex: number
  endIndex: number
  paginationPages: (number | string)[]
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function usePagination({
  currentPage,
  totalCount,
  itemsPerPage,
}: UsePaginationProps): UsePaginationReturn {
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(totalCount / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    // Generate pagination pages with ellipsis
    const getPaginationPages = (): (number | string)[] => {
      const pages: (number | string)[] = []
      const showEllipsisThreshold = 7

      if (totalPages <= showEllipsisThreshold) {
        // Show all pages if total is small
        return Array.from({ length: totalPages }, (_, i) => i + 1)
      }

      // Always show first page
      pages.push(1)

      if (currentPage <= 4) {
        // Near the beginning
        pages.push(2, 3, 4, 5)
        pages.push("...")
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push("...")
        pages.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1)
      } else {
        // In the middle
        pages.push("...")
        pages.push(currentPage - 1, currentPage, currentPage + 1)
        pages.push("...")
      }

      // Always show last page
      pages.push(totalPages)

      return pages
    }

    return {
      totalPages,
      startIndex,
      endIndex,
      paginationPages: getPaginationPages(),
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    }
  }, [currentPage, totalCount, itemsPerPage])

  return paginationData
}
