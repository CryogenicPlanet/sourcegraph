import expect from 'expect'
import { sortBy } from 'lodash'
import { describe, test, before, beforeEach, after } from 'mocha'
import MockDate from 'mockdate'

import { ExternalServiceKind } from '@sourcegraph/shared/src/graphql/schema'
import { getConfig } from '@sourcegraph/shared/src/testing/config'
import { afterEachRecordCoverage } from '@sourcegraph/shared/src/testing/coverage'
import { createDriverForTest, Driver, percySnapshot } from '@sourcegraph/shared/src/testing/driver'
import { afterEachSaveScreenshotIfFailed } from '@sourcegraph/shared/src/testing/screenshotReporter'
import { retry } from '@sourcegraph/shared/src/testing/utils'

const { gitHubToken, sourcegraphBaseUrl } = getConfig('gitHubToken', 'sourcegraphBaseUrl')

describe('e2e test suite', () => {
    let driver: Driver

    before(async function () {
        // Cloning the repositories takes ~1 minute, so give initialization 2
        // minutes instead of 1 (which would be inherited from
        // `jest.setTimeout(1 * 60 * 1000)` above).
        this.timeout(5 * 60 * 1000)

        // Reset date mocking
        MockDate.reset()

        const config = getConfig('headless', 'slowMo', 'testUserPassword')

        // Start browser
        driver = await createDriverForTest({
            sourcegraphBaseUrl,
            logBrowserConsole: true,
            ...config,
        })
        const clonedRepoSlugs = [
            'sourcegraph/java-langserver',
            'gorilla/mux',
            'gorilla/securecookie',
            'sourcegraph/jsonrpc2',
            'sourcegraph/go-diff',
            'sourcegraph/appdash',
            'sourcegraph/sourcegraph-typescript',
            'sourcegraph-testing/automation-e2e-test',
            'sourcegraph/e2e-test-private-repository',
        ]
        const alwaysCloningRepoSlugs = ['sourcegraphtest/AlwaysCloningTest']
        await driver.ensureLoggedIn({ username: 'test', password: config.testUserPassword, email: 'test@test.com' })
        await driver.resetUserSettings()
        await driver.ensureHasExternalService({
            kind: ExternalServiceKind.GITHUB,
            displayName: 'test-test-github',
            config: JSON.stringify({
                url: 'https://github.com',
                token: gitHubToken,
                repos: clonedRepoSlugs.concat(alwaysCloningRepoSlugs),
            }),
            ensureRepos: clonedRepoSlugs.map(slug => `github.com/${slug}`),
            alwaysCloning: alwaysCloningRepoSlugs.map(slug => `github.com/${slug}`),
        })
    })

    after('Close browser', () => driver?.close())

    afterEachSaveScreenshotIfFailed(() => driver.page)
    afterEachRecordCoverage(() => driver)

    beforeEach(async () => {
        if (driver) {
            // Clear local storage to reset sidebar selection (files or tabs) for each test
            await driver.page.evaluate(() => {
                localStorage.setItem('repo-revision-sidebar-last-tab', 'files')
            })

            await driver.resetUserSettings()
        }
    })

    // Used to avoid the "Node is either not visible or not an HTMLElement" error when using Puppeteer .click() method.
    // This usually happens if clicking on a link inside a popover or modal.
    const clickAnchorElement = (selector: string) =>
        driver.page.evaluate(
            (selector: string) => document.querySelector<HTMLAnchorElement>(selector)?.click(),
            selector
        )

    describe('Visual tests', () => {
        test('Repositories list', async () => {
            await driver.page.goto(sourcegraphBaseUrl + '/site-admin/repositories?query=gorilla%2Fmux')
            await driver.page.waitForSelector('a[href="/github.com/gorilla/mux"]', { visible: true })
            await percySnapshot(driver.page, 'Repositories list')
        })

        test('Site admin overview', async () => {
            await driver.page.goto(sourcegraphBaseUrl + '/site-admin')
            await driver.page.waitForSelector('.test-site-admin-overview-menu', { visible: true })
            await driver.page.waitForSelector('.test-product-certificate', { visible: true })
            await percySnapshot(driver.page, 'Site admin overview')
        })
    })

    describe('Theme switcher', () => {
        // Issue to fix: https://github.com/sourcegraph/sourcegraph/issues/25949
        test.skip('changes the theme', async () => {
            await driver.page.goto(sourcegraphBaseUrl + '/github.com/gorilla/mux/-/blob/mux.go')
            await driver.page.waitForSelector('.theme.theme-dark, .theme.theme-light', { visible: true })

            const getActiveThemeClasses = (): Promise<string[]> =>
                driver.page.evaluate(() =>
                    [...document.querySelector('.theme')!.classList].filter(className => className.startsWith('theme-'))
                )

            expect(await getActiveThemeClasses()).toHaveLength(1)
            await driver.page.waitForSelector('.test-user-nav-item-toggle')
            await driver.page.click('.test-user-nav-item-toggle')

            // Switch to dark
            await driver.page.select('.test-theme-toggle', 'dark')
            expect(await getActiveThemeClasses()).toEqual(expect.arrayContaining(['theme-dark']))

            // Switch to light
            await driver.page.select('.test-theme-toggle', 'light')
            expect(await getActiveThemeClasses()).toEqual(expect.arrayContaining(['theme-light']))
        })
    })

    describe('Repository component', () => {
        const blobTableSelector = '.test-blob > table'

        const getHoverContents = async (): Promise<string[]> => {
            // Search for any child of test-tooltip-content: as test-tooltip-content has display: contents,
            // it will never be detected as visible by waitForSelector(), but its children will.
            const selector = '.test-tooltip-content *'
            await driver.page.waitForSelector(selector, { visible: true })
            return driver.page.evaluate(() =>
                // You can't reference hoverContentSelector in puppeteer's driver.page.evaluate
                [...document.querySelectorAll('.test-tooltip-content')].map(content => content.textContent || '')
            )
        }

        const hoverOver = async (lineBase1: number, characterBase1: number): Promise<void> => {
            const codeSelector = `td[data-line="${lineBase1}"] + .code`
            await driver.page.waitForSelector(codeSelector, { visible: true })

            const findToken = (characterBase1Copy: number, codeSelectorCopy: string): string | undefined => {
                const recur = (offset: number, selector: string): string | number => {
                    const element = document.querySelector(selector)
                    if (element === null) {
                        return offset
                    }

                    for (let index = 0; index < element.childNodes.length; index++) {
                        const child = element.childNodes[index]
                        const childSelector = `${selector} > :nth-child(${index + 1})`
                        if (child.nodeType === Node.TEXT_NODE) {
                            if (child.nodeValue === null) {
                                continue
                            }

                            if (offset < child.nodeValue.length) {
                                return selector
                            }

                            offset -= child.nodeValue.length
                        } else if (child.nodeType === Node.ELEMENT_NODE) {
                            const result = recur(offset, childSelector)
                            if (typeof result === 'string') {
                                return result
                            }
                            offset = result
                        } else {
                            throw new Error(`clickHoverJ2D: unexpected node type ${child.nodeType}`)
                        }
                    }

                    return offset
                }

                const result = recur(characterBase1Copy - 1, codeSelectorCopy)
                if (typeof result === 'string') {
                    return result
                }
                return undefined
            }

            const token = await driver.page.evaluate(findToken, characterBase1, codeSelector)
            if (token === undefined) {
                throw new Error(`clickHoverJ2D: no token found at line ${lineBase1} and character ${characterBase1}`)
            }

            await driver.page.hover(token)
        }

        const clickHoverJ2D = async (lineBase1: number, characterBase1: number): Promise<void> => {
            await hoverOver(lineBase1, characterBase1)

            const goToDefinition = '.test-tooltip-go-to-definition'
            await driver.page.waitForSelector(goToDefinition, { visible: true })
            await clickAnchorElement(goToDefinition)
        }
        const clickHoverFindReferences = async (lineBase1: number, characterBase1: number): Promise<void> => {
            await hoverOver(lineBase1, characterBase1)

            const selector = '.test-tooltip-find-references'
            await driver.page.waitForSelector(selector, { visible: true })
            await clickAnchorElement(selector)
        }

        describe('file tree', () => {
            test('does navigation on file click', async () => {
                await driver.page.goto(
                    sourcegraphBaseUrl + '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d'
                )
                await (
                    await driver.page.waitForSelector('[data-tree-path="async.go"]', {
                        visible: true,
                    })
                )?.click()
                await driver.assertWindowLocation(
                    '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d/-/blob/async.go'
                )
            })

            test('expands directory on row click (no navigation)', async () => {
                await driver.page.goto(
                    sourcegraphBaseUrl + '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d'
                )
                await driver.page.waitForSelector('[data-testid="tree-row-icon"]', { visible: true })
                await driver.page.click('[data-testid="tree-row-icon"]')
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="websocket"]', {
                    visible: true,
                })
                await driver.page.waitForSelector('[data-tree-row-expanded="true"] [data-tree-path="websocket"]', {
                    visible: true,
                })
                await driver.assertWindowLocation(
                    '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d'
                )
            })

            test('does navigation on directory row click', async () => {
                await driver.page.goto(
                    sourcegraphBaseUrl + '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d'
                )
                await driver.page.waitForSelector('[data-testid="tree-row-label"]', { visible: true })
                await driver.page.click('[data-testid="tree-row-label"')
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="websocket"]', {
                    visible: true,
                })
                await driver.page.waitForSelector('[data-tree-row-expanded="true"] [data-tree-path="websocket"]', {
                    visible: true,
                })
                await driver.assertWindowLocation(
                    '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d/-/tree/websocket'
                )
            })

            test('selects the current file', async () => {
                await driver.page.goto(
                    sourcegraphBaseUrl +
                        '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d/-/blob/async.go'
                )
                await driver.page.waitForSelector('[data-tree-row-active="true"] [data-tree-path="async.go"]', {
                    visible: true,
                })
            })

            test('shows partial tree when opening directory', async () => {
                await driver.page.goto(
                    sourcegraphBaseUrl +
                        '/github.com/sourcegraph/jsonrpc2@c6c7b9aa99fb76ee5460ccd3912ba35d419d493d/-/tree/websocket'
                )
                await driver.page.waitForSelector('[data-testid="tree-row"]', { visible: true })
                expect(
                    await driver.page.evaluate(() => document.querySelectorAll('[data-testid="tree-row"]').length)
                ).toEqual(1)
            })

            test('responds to keyboard shortcuts', async () => {
                const assertNumberRowsExpanded = async (expectedCount: number): Promise<void> => {
                    expect(
                        await driver.page.evaluate(
                            () => document.querySelectorAll('[data-tree-row-expanded="true"]').length
                        )
                    ).toEqual(expectedCount)
                }
                await driver.page.goto(
                    sourcegraphBaseUrl +
                        '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/.travis.yml'
                )
                await driver.page.waitForSelector('[data-testid="tree-row"]', { visible: true }) // waitForSelector for tree to render

                await driver.page.click('.test-repo-revision-sidebar [data-testid="tree"]')
                await driver.page.keyboard.press('ArrowUp') // arrow up to 'diff' directory
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="diff"]', {
                    visible: true,
                })
                await driver.page.keyboard.press('ArrowRight') // arrow right (expand 'diff' directory)
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="diff"]', {
                    visible: true,
                })
                await driver.page.waitForSelector('[data-tree-row-expanded="true"] [data-tree-path="diff"]', {
                    visible: true,
                })
                await driver.page.waitForSelector('[data-testid="tree-row"] [data-tree-path="diff/testdata"]', {
                    visible: true,
                })
                await driver.page.keyboard.press('ArrowRight') // arrow right (move to nested 'diff/testdata' directory)
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="diff/testdata"]', {
                    visible: true,
                })
                await assertNumberRowsExpanded(1) // only `diff` directory is expanded, though `diff/testdata` is expanded

                await driver.page.keyboard.press('ArrowRight') // arrow right (expand 'diff/testdata' directory)
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="diff/testdata"]', {
                    visible: true,
                })
                await driver.page.waitForSelector('[data-tree-row-expanded="true"] [data-tree-path="diff/testdata"]', {
                    visible: true,
                })
                await assertNumberRowsExpanded(2) // `diff` and `diff/testdata` directories expanded

                await driver.page.waitForSelector(
                    '[data-testid="tree-row"] [data-tree-path="diff/testdata/empty.diff"]',
                    {
                        visible: true,
                    }
                )
                // select some file nested under `diff/testdata`
                await driver.page.keyboard.press('ArrowDown') // arrow down
                await driver.page.keyboard.press('ArrowDown') // arrow down
                await driver.page.keyboard.press('ArrowDown') // arrow down
                await driver.page.keyboard.press('ArrowDown') // arrow down
                await driver.page.waitForSelector(
                    '[data-tree-row-selected="true"] [data-tree-path="diff/testdata/empty_orig.diff"]',
                    {
                        visible: true,
                    }
                )

                await driver.page.keyboard.press('ArrowLeft') // arrow left (navigate immediately up to parent directory `diff/testdata`)
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="diff/testdata"]', {
                    visible: true,
                })
                await assertNumberRowsExpanded(2) // `diff` and `diff/testdata` directories expanded

                await driver.page.keyboard.press('ArrowLeft') // arrow left
                await driver.page.waitForSelector('[data-tree-row-selected="true"] [data-tree-path="diff/testdata"]', {
                    visible: true,
                }) // `diff/testdata` still selected
                await assertNumberRowsExpanded(1) // only `diff` directory expanded
            })
        })
        describe('symbol sidebar', () => {
            const listSymbolsTests = [
                {
                    name: 'lists symbols in file for Go',
                    filePath:
                        '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/cmd/go-diff/go-diff.go',
                    symbolNames: ['main', 'stdin', 'diffPath', 'fileIdx', 'main'],
                    symbolTypes: ['package', 'constant', 'variable', 'variable', 'function'],
                },
                {
                    name: 'lists symbols in another file for Go',
                    filePath:
                        '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/diff.go',
                    symbolNames: [
                        'diff',
                        'Stat',
                        'Stat',
                        'hunkPrefix',
                        'hunkHeader',
                        'diffTimeParseLayout',
                        'diffTimeFormatLayout',
                        'add',
                    ],
                    symbolTypes: [
                        'package',
                        'function',
                        'function',
                        'variable',
                        'constant',
                        'constant',
                        'constant',
                        'function',
                    ],
                },
                {
                    name: 'lists symbols in file for Python',
                    filePath:
                        '/github.com/sourcegraph/appdash@ebfcffb1b5c00031ce797183546746715a3cfe87/-/blob/python/appdash/sockcollector.py',
                    symbolNames: [
                        'RemoteCollector',
                        'sock',
                        '_debug',
                        '__init__',
                        '_log',
                        'connect',
                        'collect',
                        'close',
                    ],
                    symbolTypes: ['class', 'variable', 'variable', 'field', 'field', 'field', 'field', 'field'],
                },
                {
                    name: 'lists symbols in file for TypeScript',
                    filePath:
                        '/github.com/sourcegraph/sourcegraph-typescript@a7b7a61e31af76dad3543adec359fa68737a58a1/-/blob/server/src/cancellation.ts',
                    symbolNames: [
                        'createAbortError',
                        'isAbortError',
                        'throwIfCancelled',
                        'tryCancel',
                        'toAxiosCancelToken',
                        'source',
                    ],
                    symbolTypes: ['constant', 'constant', 'function', 'function', 'function', 'constant'],
                },
                {
                    name: 'lists symbols in file for Java',
                    filePath:
                        '/github.com/sourcegraph/java-langserver@03efbe9558acc532e88f5288b4e6cfa155c6f2dc/-/blob/src/main/java/com/sourcegraph/common/Config.java',
                    symbolNames: [
                        'com.sourcegraph.common',
                        'Config',
                        'LIGHTSTEP_INCLUDE_SENSITIVE',
                        'LIGHTSTEP_PROJECT',
                        'LIGHTSTEP_TOKEN',
                        'ANDROID_JAR_PATH',
                        'IGNORE_DEPENDENCY_RESOLUTION_CACHE',
                        'LSP_TIMEOUT',
                        'LANGSERVER_ROOT',
                        'LOCAL_REPOSITORY',
                        'EXECUTE_GRADLE_ORIGINAL_ROOT_PATHS',
                        'shouldExecuteGradle',
                        'PRIVATE_REPO_ID',
                        'PRIVATE_REPO_URL',
                        'PRIVATE_REPO_USERNAME',
                        'PRIVATE_REPO_PASSWORD',
                        'log',
                        'checkEnv',
                        'ConfigException',
                    ],
                    symbolTypes: [
                        'package',
                        'class',
                        'field',
                        'field',
                        'field',
                        'field',
                        'field',
                        'field',
                        'field',
                        'field',
                        'field',
                        'method',
                        'field',
                        'field',
                        'field',
                        'field',
                        'field',
                        'method',
                        'class',
                    ],
                },
            ]

            for (const symbolTest of listSymbolsTests) {
                test(symbolTest.name, async () => {
                    await driver.page.goto(sourcegraphBaseUrl + symbolTest.filePath)

                    await (await driver.page.waitForSelector('[data-tab-content="symbols"]'))?.click()

                    await driver.page.waitForSelector('.test-symbol-name', { visible: true })

                    const symbolNames = await driver.page.evaluate(() =>
                        [...document.querySelectorAll('.test-symbol-name')].map(name => name.textContent || '')
                    )
                    const symbolTypes = await driver.page.evaluate(() =>
                        [...document.querySelectorAll('.test-symbol-icon')].map(
                            icon => icon.getAttribute('data-tooltip') || ''
                        )
                    )

                    expect(sortBy(symbolNames)).toEqual(sortBy(symbolTest.symbolNames))
                    expect(sortBy(symbolTypes)).toEqual(sortBy(symbolTest.symbolTypes))
                })
            }

            const navigateToSymbolTests = [
                {
                    name: 'navigates to file on symbol click for Go',
                    repoPath: '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d',
                    filePath: '/tree/cmd',
                    symbolPath: '/blob/cmd/go-diff/go-diff.go?L19:2-19:10',
                },
                {
                    name: 'navigates to file on symbol click for Java',
                    repoPath: '/github.com/sourcegraph/java-langserver@03efbe9558acc532e88f5288b4e6cfa155c6f2dc',
                    filePath: '/tree/src/main/java/com/sourcegraph/common',
                    symbolPath: '/blob/src/main/java/com/sourcegraph/common/Config.java?L14:20-14:26',
                    skip: true,
                },
                {
                    name:
                        'displays valid symbols at different file depths for Go (./examples/cmd/webapp-opentracing/main.go.go)',
                    repoPath: '/github.com/sourcegraph/appdash@ebfcffb1b5c00031ce797183546746715a3cfe87',
                    filePath: '/tree/examples',
                    symbolPath: '/blob/examples/cmd/webapp-opentracing/main.go?L26:6-26:10',
                    skip: true,
                },
                {
                    name: 'displays valid symbols at different file depths for Go (./sqltrace/sql.go)',
                    repoPath: '/github.com/sourcegraph/appdash@ebfcffb1b5c00031ce797183546746715a3cfe87',
                    filePath: '/tree/sqltrace',
                    symbolPath: '/blob/sqltrace/sql.go?L14:2-14:5',
                    skip: true,
                },
            ]

            for (const navigationTest of navigateToSymbolTests) {
                const testFunc = navigationTest.skip ? test.skip : test
                testFunc(navigationTest.name, async () => {
                    const repoBaseURL = sourcegraphBaseUrl + navigationTest.repoPath + '/-'

                    await driver.page.goto(repoBaseURL + navigationTest.filePath)

                    await (await driver.page.waitForSelector('[data-tab-content="symbols"]'))?.click()

                    await driver.page.waitForSelector('.test-symbol-name', { visible: true })

                    await (
                        await driver.page.waitForSelector(`.test-symbol-link[href*="${navigationTest.symbolPath}"]`, {
                            visible: true,
                        })
                    )?.click()
                    await driver.assertWindowLocation(repoBaseURL + navigationTest.symbolPath, true)
                })
            }

            const highlightSymbolTests = [
                {
                    name: 'highlights correct line for Go',
                    filePath:
                        '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/diff.go',
                    index: 5,
                    line: 65,
                },
                {
                    name: 'highlights correct line for TypeScript',
                    filePath:
                        '/github.com/sourcegraph/sourcegraph-typescript@a7b7a61e31af76dad3543adec359fa68737a58a1/-/blob/server/src/cancellation.ts',
                    index: 2,
                    line: 17,
                },
            ]

            for (const { name, filePath, index, line } of highlightSymbolTests) {
                test(name, async () => {
                    await driver.page.goto(sourcegraphBaseUrl + filePath)
                    await driver.page.waitForSelector('[data-tab-content="symbols"]')
                    await driver.page.click('[data-tab-content="symbols"]')
                    await driver.page.waitForSelector('.test-symbol-name', { visible: true })
                    await driver.page.click(`[data-testid="filtered-connection-nodes"] li:nth-child(${index + 1}) a`)

                    await driver.page.waitForSelector('.test-blob .selected .line')
                    const selectedLineNumber = await driver.page.evaluate(() => {
                        const element = document.querySelector<HTMLElement>('.test-blob .selected .line')
                        return element?.dataset.line && parseInt(element.dataset.line, 10)
                    })

                    expect(selectedLineNumber).toEqual(line)
                })
            }
        })

        describe('hovers', () => {
            describe('Blob', () => {
                test('gets displayed and updates URL when hovering over a token', async () => {
                    await driver.page.goto(
                        sourcegraphBaseUrl +
                            '/github.com/gorilla/mux@15a353a636720571d19e37b34a14499c3afa9991/-/blob/mux.go'
                    )
                    await driver.page.waitForSelector(blobTableSelector)

                    await driver.page.waitForSelector('td[data-line="24"]', { visible: true })
                    await driver.page.evaluate(() => {
                        document.querySelector('td[data-line="24"]')?.parentElement?.click()
                    })

                    await driver.assertWindowLocation(
                        '/github.com/gorilla/mux@15a353a636720571d19e37b34a14499c3afa9991/-/blob/mux.go?L24'
                    )

                    await hoverOver(24, 6)

                    await getHoverContents() // verify there is a hover
                    await percySnapshot(driver.page, 'Code intel hover tooltip')
                })

                describe('jump to definition', () => {
                    test('noops when on the definition', async () => {
                        await driver.page.goto(
                            sourcegraphBaseUrl +
                                '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/parse.go?L29:6'
                        )
                        await clickHoverJ2D(29, 6)
                        await driver.assertWindowLocation(
                            '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/parse.go?L29:6'
                        )
                    })

                    test('does navigation (same repo, same file)', async () => {
                        await driver.page.goto(
                            sourcegraphBaseUrl +
                                '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/parse.go?L25:10'
                        )
                        await clickHoverJ2D(25, 10)
                        await driver.assertWindowLocation(
                            '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/parse.go?L29:6'
                        )
                    })

                    test.skip('does navigation (same repo, different file)', async () => {
                        await driver.page.goto(
                            sourcegraphBaseUrl +
                                '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/print.go?L13:31'
                        )
                        await clickHoverJ2D(13, 31)
                        await driver.assertWindowLocation(
                            '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/diff.pb.go?L38:6'
                        )
                        // Verify file tree is highlighting the new path.
                        await driver.page.waitForSelector(
                            '[data-tree-row-active="true"] [data-tree-path="diff/diff.pb.go"]',
                            {
                                visible: true,
                            }
                        )
                    })

                    // basic code intel doesn't support cross-repo jump-to-definition yet.
                    // If this test gets re-enabled `sourcegraph/vcsstore` and
                    // `sourcegraph/go-vcs` need to be cloned.
                    test.skip('does navigation (external repo)', async () => {
                        await driver.page.goto(
                            sourcegraphBaseUrl +
                                '/github.com/sourcegraph/vcsstore@267289226b15e5b03adedc9746317455be96e44c/-/blob/server/diff.go?L27:30'
                        )
                        await clickHoverJ2D(27, 30)
                        await driver.assertWindowLocation(
                            '/github.com/sourcegraph/go-vcs@aa7c38442c17a3387b8a21f566788d8555afedd0/-/blob/vcs/repository.go?L103:6'
                        )
                    })
                })

                describe('find references', () => {
                    test('opens widget and fetches local references', async function () {
                        this.timeout(120000)

                        await driver.page.goto(
                            sourcegraphBaseUrl +
                                '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/parse.go?L29:6'
                        )
                        await clickHoverFindReferences(29, 6)
                        await driver.assertWindowLocation(
                            '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/parse.go?L29:6#tab=references'
                        )

                        await driver.assertNonemptyLocalRefs()

                        // verify the appropriate # of references are fetched
                        await driver.page.waitForSelector(
                            '[data-testid="panel-tabs-content"] [data-testid="file-match-children"]',
                            {
                                visible: true,
                            }
                        )
                        await retry(async () =>
                            expect(
                                await driver.page.evaluate(
                                    () =>
                                        document.querySelectorAll(
                                            '[data-testid="panel-tabs-content"] [data-testid="file-match-children-item"]'
                                        ).length
                                )
                            ).toEqual(
                                // Basic code intel finds 8 references with some overlapping context, resulting in 4 hunks.
                                4
                            )
                        )

                        // verify all the matches highlight a `MultiFileDiffReader` token
                        await driver.assertAllHighlightedTokens('MultiFileDiffReader')
                    })

                    // TODO unskip this once basic-code-intel looks for external
                    // references even when local references are found.
                    test.skip('opens widget and fetches external references', async () => {
                        await driver.page.goto(
                            sourcegraphBaseUrl +
                                '/github.com/sourcegraph/go-diff@3f415a150aec0685cb81b73cc201e762e075006d/-/blob/diff/parse.go?L32:16#tab=references'
                        )

                        // verify some external refs are fetched (we cannot assert how many, but we can check that the matched results
                        // look like they're for the appropriate token)
                        await driver.assertNonemptyExternalRefs()

                        // verify all the matches highlight a `Reader` token
                        await driver.assertAllHighlightedTokens('Reader')
                    })
                })
            })
        })
    })
})
