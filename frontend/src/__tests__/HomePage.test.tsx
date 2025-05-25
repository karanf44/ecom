import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page' // Assuming your HomePage component is at src/app/page.tsx

describe('HomePage', () => {
  it('renders a heading', () => {
    render(<HomePage />)

    const heading = screen.getByRole('heading', {
      name: /welcome to EcomStore/i, // Adjusted to match the actual heading text
    })

    expect(heading).toBeInTheDocument()
  })
}) 