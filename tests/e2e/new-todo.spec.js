import * as fc from 'fast-check';

/*describe('New todo', () => {
  it('it should create new todo', () => {
    cy.visit('/');
    cy.contains('h1', 'todos');

    cy.get('.new-todo').type('Demo').type('{enter}');

    cy.get('.main .todo-list .view').contains('Demo');
  });
});*/

let id = 0;

function getFiltered(m, filter) {
  if (filter == 'Active') {
    return m.filter(x => !x.checked);
  }
  if (filter == 'Completed') {
    return m.filter(x => x.checked);
  }
  return m;
}

function checkModel(mOld, filter) {
  const m = JSON.parse(JSON.stringify(mOld));
  const filtered = getFiltered(m, filter);

  if (filtered.length > 0) {
    cy.get('.main .todo-list .view').each((x, i) => {
      const elem = filtered[i];
      assert.strictEqual(x[0].childNodes[0].checked, elem.checked);
      assert.strictEqual(x[0].childNodes[1].innerText, elem.value);
    });
  }
  if (m.length > 0) {
    cy.get('.todo-count').contains('' + m.filter(x => !x.checked).length);
  }
}

class NewTodoCommand {
  constructor(str) {
    this.str = str;
  }

  check = () => true;
  run({ arr: m, filter }) {
    cy.get('.new-todo').type(this.str).type('{enter}'); //Impact the world
    m.push({ value: this.str, checked: false, id: id++ }); // Impact the model
    checkModel(m, filter);
  }
}

class ToggleTodoCommand {
  constructor(n) {
    this.n = n;
  }
  check = m => getFiltered(m.arr, m.filter).length > 0;
  run({ arr: m, filter }) {
    const filtered = getFiltered(m, filter);
    const elem = filtered[this.n % filtered.length];
    const x = cy.get('.main .todo-list .view [type=checkbox]').eq(this.n % filtered.length);

    if (elem.checked) {
      x.uncheck();
    } else {
      x.check();
    }

    m.find(x => x.id == elem.id).checked = !elem.checked;
    checkModel(m, filter);
  }
}

class ClearCommand {
  check = m => m.arr.filter(x => x.checked).length > 0;
  run(m) {
    m.arr = m.arr.filter(x => !x.checked);
    cy.get('.clear-completed').click();
    checkModel(m.arr, m.filter);
  }
}

class SelectFilterCommand {
  constructor(filter) {
    this.filter = filter;
  }
  check = m => m.arr.length > 0;
  run(m) {
    m.filter = this.filter;
    cy.get('.filters').contains(this.filter).click();
    checkModel(m.arr, m.filter);
  }
}

describe('Property tests', () => {
  it('can add todos', () => {
    cy.viewport(1000, 2000);
    cy.visit('/');

    const commands = [
      //fc.string({ minLength: 1 })
      fc.base64String({ minLength: 1 }).map(s => new NewTodoCommand(s)),
      fc.nat().map(n => new ToggleTodoCommand(n)),
      fc.constant(new ClearCommand()),
      fc.constantFrom('All', 'Active', 'Completed').map(x => new SelectFilterCommand(x))
    ];
    fc.assert(
      fc
        .property(fc.commands(commands, { size: '+1', maxCommands: 50 }), cmds => {
          const start = () => ({ model: { arr: [], filter: 'All' }, real: undefined });
          fc.modelRun(start, cmds);
        })
        .beforeEach(() => {
          cy.clearLocalStorage();
          cy.reload();
        }),
      {
        numRuns: 2
      }
    );
    cy.log('Tests are passing 🎉');
  });
});
