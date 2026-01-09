import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { TaskCardComponent } from './task-card.component';
import { ITask, TaskStatus, TaskPriority, IUser, UserRole } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

describe('TaskCardComponent', () => {
  let component: TaskCardComponent;
  let fixture: ComponentFixture<TaskCardComponent>;

  const mockUser: IUser = {
    id: 'user-123',
    email: 'assignee@example.com',
    organizationId: 'org-123',
    role: 'admin' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockTask = (overrides: Partial<ITask> = {}): ITask => ({
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    dueDate: null,
    position: 1,
    organizationId: 'org-123',
    createdById: 'creator-123',
    assigneeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;
  });

  describe('Rendering', () => {
    it('should create', () => {
      fixture.componentRef.setInput('task', createMockTask());
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });

    it('should display task title', () => {
      fixture.componentRef.setInput('task', createMockTask({ title: 'My Important Task' }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('My Important Task');
    });

    it('should display task description when present', () => {
      fixture.componentRef.setInput('task', createMockTask({ description: 'This is a detailed description' }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('This is a detailed description');
    });

    it('should not display description element when description is null', () => {
      fixture.componentRef.setInput('task', createMockTask({ description: null }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      // Description paragraph (p tag with gray-500 class) should not be present
      const descriptionParagraph = compiled.querySelector('p.text-gray-500');
      expect(descriptionParagraph).toBeFalsy();
    });

    it('should display priority badge', () => {
      fixture.componentRef.setInput('task', createMockTask({ priority: 'urgent' }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('urgent');
    });

    it('should display "No due date" when dueDate is null', () => {
      fixture.componentRef.setInput('task', createMockTask({ dueDate: null }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('No due date');
    });

    it('should display assignee email when present', () => {
      fixture.componentRef.setInput('task', createMockTask({
        assigneeId: 'user-123',
        assignee: mockUser,
      }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('assignee');
    });
  });

  describe('Event Emission', () => {
    it('should emit edit event when card is clicked', () => {
      const task = createMockTask();
      fixture.componentRef.setInput('task', task);
      fixture.detectChanges();

      const editSpy = vi.spyOn(component.edit, 'emit');

      component.onEdit();

      expect(editSpy).toHaveBeenCalledWith(task);
    });

    it('should emit the correct task when edit is triggered', () => {
      const task = createMockTask({ id: 'specific-task-id', title: 'Specific Task' });
      fixture.componentRef.setInput('task', task);
      fixture.detectChanges();

      let emittedTask: ITask | null = null;
      component.edit.subscribe((t) => {
        emittedTask = t;
      });

      component.onEdit();

      expect(emittedTask).toEqual(task);
    });
  });

  describe('Accessibility', () => {
    it('should have cursor-pointer class for clickable area', () => {
      fixture.componentRef.setInput('task', createMockTask());
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.cursor-pointer');

      expect(card).toBeTruthy();
    });

    it('should have title attribute on assignee for full email', () => {
      fixture.componentRef.setInput('task', createMockTask({
        assigneeId: 'user-123',
        assignee: mockUser,
      }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const assigneeSpan = compiled.querySelector('[title="assignee@example.com"]');

      expect(assigneeSpan).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with all null optional fields', () => {
      fixture.componentRef.setInput('task', createMockTask({
        description: null,
        dueDate: null,
        assigneeId: null,
        assignee: undefined,
      }));
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });

    it('should handle very long titles with truncation', () => {
      const longTitle = 'A'.repeat(200);
      fixture.componentRef.setInput('task', createMockTask({ title: longTitle }));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      // The line-clamp class should handle truncation
      const titleEl = compiled.querySelector('.line-clamp-2');
      expect(titleEl).toBeTruthy();
    });

    it('should handle assignee without email gracefully', () => {
      fixture.componentRef.setInput('task', createMockTask({
        assigneeId: 'user-123',
        assignee: { ...mockUser, email: '' },
      }));
      fixture.detectChanges();

      // Should not throw
      expect(component).toBeTruthy();
    });
  });
});
