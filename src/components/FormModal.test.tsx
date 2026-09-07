import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { FormModal, type FormField } from './FormModal'

/*
 * Markup-level regression tests for the shared form modal.
 *
 * Root cause guarded against here: a controlled <select value=""> whose
 * option list contains no matching empty option makes browsers DISPLAY the
 * first option while React state stays ''. The user sees a phantom
 * pre-selection and submit-time validation reports the field as required.
 *
 * Contract: EVERY select always renders an explicit blank <option value="">
 * first; when state holds a real value, that exact option carries the
 * selected attribute instead.
 */

function renderFields(fields: FormField[]): string {
  return renderToStaticMarkup(
    <FormModal
      title="probe"
      fields={fields}
      submitLabel="Submit"
      onSubmit={async () => {}}
      onClose={() => {}}
    />,
  )
}

const SELECT_FIELDS: FormField[] = [
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    options: ['Infrastructure', 'Application'].map((v) => ({ value: v, label: v })),
  },
  {
    name: 'currency',
    label: 'Currency',
    type: 'select',
    required: true,
    options: ['USD', 'INR'].map((v) => ({ value: v, label: v })),
  },
]

describe('FormModal select binding', () => {
  it('renders an explicit blank option for every required select (phantom pre-selection guard)', () => {
    const html = renderFields(SELECT_FIELDS)
    const selects = html.match(/<select[^>]*>[\s\S]*?<\/select>/g) ?? []

    assert.equal(selects.length, 2)

    for (const select of selects) {
      const firstOption = select.match(/<option[^>]*>/)?.[0]
      // The blank choice exists AND is the explicitly selected one.
      assert.ok(firstOption?.startsWith('<option value=""'), `first option must be blank: ${firstOption}`)
      assert.match(firstOption ?? '', /selected/)

      // No REAL value may appear pre-selected while state is empty.
      const realOptionsSelected = (select.match(/<option(?! value="")[^>]*selected[^>]*>/g) ?? []).length
      assert.equal(realOptionsSelected, 0)
    }
  })

  it('marks the option matching current state as selected (controlled binding works)', () => {
    const fields = SELECT_FIELDS.map((field) =>
      field.name === 'type' ? { ...field, initial: 'Application' } : field,
    )

    const html = renderFields(fields)
    const selects = html.match(/<select[^>]*>[\s\S]*?<\/select>/g) ?? []
    const typeSelect = selects[0]
    assert.ok(typeSelect, 'type select must render')
    const selected = typeSelect.match(/<option([^>]*)selected([^>]*)>([^<]*)</)?.[3]

    assert.equal(selected, 'Application')
  })

  it('keeps text/money inputs as plain controlled inputs', () => {
    const html = renderFields([
      { name: 'annualValue', label: 'Annual Value', type: 'money', required: true },
    ])

    assert.match(html, /<input[^>]*inputMode="decimal"/)
    assert.equal(/<select/.test(html), false)
  })
})
