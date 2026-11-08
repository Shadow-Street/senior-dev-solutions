import { render, screen } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sidebarTabClass } from '../sidebarTabClass'

// Regression: the selected Super Admin sidebar item showed black text, because
// the base TabsTrigger's data-[state=active]:text-foreground beat text-white.
describe('Super Admin sidebar tab', () => {
  it('keeps white text on the selected item', () => {
    render(
      <Tabs value="users">
        <TabsList>
          <TabsTrigger value="users" className={sidebarTabClass(true)}>Users</TabsTrigger>
          <TabsTrigger value="polls" className={sidebarTabClass(false)}>Polls</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const active = screen.getByRole('tab', { name: 'Users' })
    expect(active).toHaveAttribute('data-state', 'active')
    expect(active.className).toContain('data-[state=active]:text-white')
    expect(active.className).not.toContain('data-[state=active]:text-foreground')
    expect(active.className).not.toContain('data-[state=active]:bg-background')
  })
})
