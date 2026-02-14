import { Modal } from './Modal';
import { Button } from './Button';
import { useState } from 'react';

export default {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Example Modal">
        <p className="text-gray-700">This is the modal content.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setIsOpen(false)} variant="primary">
            Confirm
          </Button>
          <Button onClick={() => setIsOpen(false)} variant="secondary">
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  );
};

export const WithLongContent = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal with Long Content</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Long Content Modal">
        <div className="text-gray-700 space-y-4">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
            ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
            dolore eu fugiat nulla pariatur.
          </p>
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={() => setIsOpen(false)} variant="primary">
            Got it!
          </Button>
        </div>
      </Modal>
    </>
  );
};

export const WithoutTitle = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal without Title</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <p className="text-gray-700">This modal has no title.</p>
        <div className="mt-4">
          <Button onClick={() => setIsOpen(false)} variant="primary">
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
};
