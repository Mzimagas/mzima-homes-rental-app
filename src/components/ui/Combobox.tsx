'use client'
import * as React from 'react'
import { Combobox as HCombobox, Transition } from '@headlessui/react'
import { Fragment } from 'react'

export interface ComboOption {
  value: string
  label: string
}

export interface ComboboxProps<T extends ComboOption = ComboOption> {
  options: T[]
  value?: T | null
  onChange: (opt: T | null) => void
  label?: string
  placeholder?: string
  displayValue?: (opt: T) => string
}

export function Combobox<T extends ComboOption = ComboOption>({
  options,
  value,
  onChange,
  label,
  placeholder,
  displayValue,
}: ComboboxProps<T>) {
  return (
    <div className="w-full">
      {label && <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>}
      <HCombobox value={value || null} onChange={onChange as any}>
        <div className="relative mt-1">
          <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white text-left shadow-sm border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <HCombobox.Input
              displayValue={(o: any) => (o ? (displayValue ? displayValue(o) : o.label) : '')}
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
              placeholder={placeholder}
            />
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => {}}
          >
            <HCombobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {options.length === 0 ? (
                <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                  No results
                </div>
              ) : (
                options.map((opt, idx) => (
                  <HCombobox.Option
                    key={opt.value}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`
                    }
                    value={opt as any}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}
                        >
                          {opt.label}
                        </span>
                        {selected ? (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            ✓
                          </span>
                        ) : null}
                      </>
                    )}
                  </HCombobox.Option>
                ))
              )}
            </HCombobox.Options>
          </Transition>
        </div>
      </HCombobox>
    </div>
  )
}

export default Combobox
