import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LANGUAGES, searchLanguages } from '../src/i18n/languages.ts'

const codes = (query: string) => searchLanguages(query).map((language) => language.code)

test('all supported languages are searchable by their English and native names', () => {
  for (const language of LANGUAGES) {
    for (const name of [language.name, language.englishName]) {
      assert.ok(codes(name).includes(language.code), name)
      assert.ok(codes(name.toUpperCase()).includes(language.code), name.toUpperCase())
      const unaccented = name.normalize('NFKD').replace(/\p{M}/gu, '')
      assert.ok(codes(unaccented).includes(language.code), unaccented)
    }
  }
})

test('language search accepts partial names, mixed casing and accents', () => {
  for (const query of ['spanish', 'SPANISH', 'Spanish Español', 'espanol', 'eSpÁÑoL', 'span', 'ＥＳＰＡＮＯＬ']) {
    assert.deepEqual(codes(query), ['es'], query)
  }
  for (const query of ['francais', 'FRANÇAIS', 'french']) assert.deepEqual(codes(query), ['fr'], query)
  for (const query of ['portuguese', 'PORTUGUES', 'português brasil']) assert.deepEqual(codes(query), ['pt'], query)
  for (const query of ['TURKCE', 'Türkçe', 'TÜRKÇE', 'turkish']) assert.deepEqual(codes(query), ['tr'], query)
  assert.deepEqual(codes('tieng viet'), ['vi'])
  assert.deepEqual(codes('  german\tDEUTSCH  '), ['de'])
  assert.deepEqual(codes('simplified chinese'), ['zh'])
  assert.deepEqual(codes('traditional chinese'), ['zht'])
  assert.deepEqual(codes('chinese'), ['zh', 'zht'])
  assert.deepEqual(codes('中文'), ['zh', 'zht'])
})

test('empty searches preserve the full list/order and unknown names return no results', () => {
  const all = LANGUAGES.map((language) => language.code)
  for (const query of ['', ' \t\n ', '\u200b']) assert.deepEqual(codes(query), all)
  assert.deepEqual(codes('not-a-real-language'), [])
  assert.deepEqual(codes('spanish german'), [])
  assert.deepEqual(LANGUAGES.map((language) => language.code), all, 'search never mutates the catalogue')
})

test('search placeholder and no-results copy exist in every locale', async () => {
  for (const { code } of LANGUAGES) {
    const { default: messages } = await import(`../src/i18n/locales/${code}.ts`)
    assert.ok(messages.app.language.search.trim(), code)
    assert.ok(messages.app.language.noResults.trim(), code)
  }
})
