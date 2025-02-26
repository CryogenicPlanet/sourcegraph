import { uniq } from 'lodash'

import { ErrorLike, isErrorLike } from '@sourcegraph/common'
import * as GQL from '@sourcegraph/shared/src/graphql/schema'
import {
    EXTENSION_CATEGORIES,
    ExtensionCategory,
    ExtensionManifest,
} from '@sourcegraph/shared/src/schema/extensionSchema'
import { Settings } from '@sourcegraph/shared/src/settings/settings'

import { quoteIfNeeded } from '../../search'
import { ExtensionCategoryOrAll } from '../ExtensionRegistry'

/** Pattern for valid extension names. */
export const EXTENSION_NAME_VALID_PATTERN = '^[a-zA-Z0-9](?:[a-zA-Z0-9]|[_.-](?=[a-zA-Z0-9]))*$'

/** Maximum allowed length for an extension name. */
export const EXTENSION_NAME_MAX_LENGTH = 128

/** A useful minimal type for a registry extension's publisher. */
export type RegistryPublisher = (
    | Pick<GQL.IUser, '__typename' | 'id' | 'username'>
    | Pick<GQL.IOrg, '__typename' | 'id' | 'name'>
) & {
    /** The prefix for extension IDs published by this publisher (with the registry's host), if any. */
    extensionIDPrefix?: string
}

/** Returns the extension ID prefix (excluding the trailing "/") for a registry extension's publisher. */
export function extensionIDPrefix(publisher: RegistryPublisher): string {
    return `${publisher.extensionIDPrefix ? `${publisher.extensionIDPrefix}/` : ''}${publisherName(publisher)}`
}

export function publisherName(publisher: RegistryPublisher): string {
    switch (publisher.__typename) {
        case 'User':
            return publisher.username
        case 'Org':
            return publisher.name
    }
}

/** Returns the extension ID (in "publisher/name" format). */
export function toExtensionID(publisher: string | RegistryPublisher, name: string): string {
    return `${typeof publisher === 'string' ? publisher : extensionIDPrefix(publisher)}/${name}`
}

/** Reports whether the given extension is mentioned (enabled or disabled) in the settings. */
export function isExtensionAdded(settings: Settings | ErrorLike | null, extensionID: string): boolean {
    return !!settings && !isErrorLike(settings) && !!settings.extensions && extensionID in settings.extensions
}

/**
 * @param categories The (unvalidated) categories defined on the extension.
 * @returns An array that is the subset of {@link categories} consisting only of known categories, sorted and with
 * duplicates removed.
 */
export function validCategories(categories: ExtensionManifest['categories']): ExtensionCategory[] | undefined {
    if (!categories || categories.length === 0) {
        return undefined
    }
    const validCategories = uniq(
        categories.filter((category): category is ExtensionCategory =>
            EXTENSION_CATEGORIES.includes(category as ExtensionCategory)
        )
    )
    return validCategories.length === 0 ? undefined : validCategories
}

/**
 * Constructs the extensions query given the options (for use in the query input field in the extension registry
 * list page).
 */
export function extensionsQuery({
    tag,
    installed,
    enabled,
    disabled,
}: {
    tag?: string
    installed?: boolean
    enabled?: boolean
    disabled?: boolean
}): string {
    const parts: string[] = []
    if (tag) {
        parts.push(`tag:${quoteIfNeeded(tag)}`)
    }
    if (installed) {
        parts.push('#installed')
    }
    if (enabled) {
        parts.push('#enabled')
    }
    if (disabled) {
        parts.push('#disabled')
    }
    return parts.join(' ')
}

/**
 * Constructs the URL to the extensions list with the given query string (which can be constructed using
 * {@link extensionsQuery}).
 */
export function urlToExtensionsQuery({
    query,
    category,
}: {
    query?: string
    category?: ExtensionCategoryOrAll
}): string {
    if (!query && !category) {
        return '/extensions'
    }

    const parameters = new URLSearchParams()
    if (query) {
        parameters.set('query', query)
    }
    if (category) {
        parameters.set('category', category)
    }
    return `/extensions?${parameters.toString()}`
}
