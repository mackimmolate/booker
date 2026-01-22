import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronsUpDown } from 'lucide-react';

interface ComboboxProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  items,
  value,
  onChange,
  placeholder,
  required,
  id
}) => {
  const [open, setOpen] = useState(false);
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter items based on input
  useEffect(() => {
    if (!value) {
      setFilteredItems(items);
    } else {
      const lower = value.toLowerCase();
      setFilteredItems(items.filter(item => item.toLowerCase().includes(lower)));
    }
  }, [value, items]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setOpen(true);
  };

  const handleSelect = (item: string) => {
    onChange(item);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          className="pr-10"
          autoComplete="off"
          // Using a random name attribute sometimes helps confusing browsers too
          name={`${id}_custom_search_${Math.random().toString(36).substring(7)}`}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          <ChevronsUpDown size={16} />
        </button>
      </div>

      {open && filteredItems.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredItems.map((item, index) => (
            <li
              key={index}
              onClick={() => handleSelect(item)}
              className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
