// All contextual help copy (rendered via <HelpButton>) lives here, in one place, so wording can
// be found and updated without hunting through the pages/components that use it. Each entry is
// { title, content } — title becomes the HelpButton's heading, content is the JSX body.

export const hstReturnsListHelp = {
  title: 'About HST Returns',
  content: (
    <>
      <p>
        Each return covers one filing period and mirrors the lines the CRA asks for on a
        GST/HST return:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Line 101 — Total Revenue:</strong> sum of your invoiced revenue for the period.</li>
        <li><strong>Line 103 — HST Collected:</strong> the HST charged to clients on those invoices.</li>
        <li><strong>Line 106 — Input Tax Credits (ITCs):</strong> the HST you paid on business expenses, which reduces what you owe. This is calculated from your logged Expenses but can be overridden.</li>
        <li><strong>Net Tax:</strong> Line 103 minus Line 106 — what you owe the CRA (or, if negative, your refund, shown in green).</li>
      </ul>
      <p>
        <strong>Status</strong> is just a tracker for your own records — <em>Draft</em> →{' '}
        <em>Filed</em> (once you've actually submitted it to the CRA) → <em>Paid</em>. Marking
        a return as Filed or Paid here doesn't file or pay anything on your behalf.
      </p>
    </>
  ),
};

export const hstReturnDetailHelp = {
  title: 'This HST Return',
  content: (
    <>
      <p>
        <strong>Line 106 (Input Tax Credits)</strong> is editable here even though it's
        calculated from your Expenses — use this if you have ITCs that weren't logged as
        expenses, or need to correct the auto-calculated figure.
      </p>
      <p>
        <strong>Net Tax</strong> updates live as you change the ITC figure: positive means you
        owe the CRA, negative (shown in green) means you're due a refund.
      </p>
      <p>
        This app doesn't submit anything to the CRA — <strong>Mark as Filed</strong> and{' '}
        <strong>Mark as Paid</strong> just update your own records after you've filed/paid
        through the CRA's actual channels. You can still edit the figures on a return after
        marking it Filed, so double-check before relying on it as a permanent record.
      </p>
    </>
  ),
};

export const newHstReturnDialogHelp = {
  title: 'Choosing a Period',
  content: (
    <>
      <p>
        The dates below default to the <strong>previous calendar quarter</strong>. If you
        file HST annually or monthly, change these to match your actual CRA filing period
        before calculating — the default won't be right for you.
      </p>
      <p>
        "Recalculate" pulls Line 101/103 from invoices dated in this range, and Line 106
        from expenses in the same range. You can still override the ITC figure by hand
        afterward.
      </p>
    </>
  ),
};

export const projectRateHelp = {
  title: 'How Rates Are Resolved',
  content: (
    <>
      <p>
        When you billing time on this project, the rate used is looked up in this
        order: <strong>this project's rate</strong> → the <strong>client's default
        rate</strong> → $0.
      </p>
      <p>
        This field is pre-filled from the client's rate when you first pick a client,
        but once saved it's an <strong>independent value</strong> — changing the
        client's default rate later won't update it. Leaving it blank on a new project
        means it'll follow the client's rate; note that blanking it out on a project
        that already has a rate saved won't clear that rate.
      </p>
    </>
  ),
};

export const disbursementsHelp = {
  title: 'How Disbursements Work',
  content: (
    <>
      <p>
        A <strong>disbursement</strong> is an out-of-pocket cost you paid on behalf of this
        project that you intend to pass on to the client at cost — things like a stock photo
        license, a domain registration, or shipping. It's not your own time or labour; that's
        tracked separately through time entries.
      </p>
      <p>
        Disbursements are <strong>pass-through reimbursements, not taxed</strong> — they're
        billed at exactly the amount you enter, with no tax applied, unlike hourly line items.
      </p>
      <p>
        Every disbursement on a project — paid or not — is automatically included whenever you
        generate an <strong>Estimate</strong> for that project. The <strong>Paid</strong> checkbox
        is just your own record of whether you've paid the underlying cost yet; it doesn't affect
        whether it appears on an estimate, and disbursements aren't currently added to Invoices.
      </p>
    </>
  ),
};

export const timesheetsListHelp = {
  title: 'Locked Time Entries',
  content: (
    <>
      <p>
        A time entry shows <strong>Locked</strong> once it's been included as a line item on an
        invoice — at that point it can no longer be edited or deleted, so the invoice you sent
        always matches what was actually billed.
      </p>
      <p>
        To change a locked entry, you have to undo the billing first: delete the invoice it's on
        (from the Invoices page), which removes that line item and unlocks the entry — then edit
        it and re-invoice as needed.
      </p>
    </>
  ),
};

export const timesheetFormHelp = {
  title: 'Entering Time',
  content: (
    <>
      <p>
        There are two ways to record hours here, and only one is active at a time:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Start/End time:</strong> fill in both and <strong>Hours</strong> is calculated
          for you automatically — the field becomes read-only, since it's derived from the times.
        </li>
        <li>
          <strong>Hours directly:</strong> leave Start/End time blank and type the number of
          hours yourself. This is the only option for a quick entry where you don't know or care
          about the exact clock times.
        </li>
      </ul>
      <p>
        To switch from a calculated entry back to a typed one, clear both the Start and End time
        fields — Hours unlocks for editing again.
      </p>
      <p>
        <strong>Description</strong> is optional, but it's not just a personal note — once this
        entry is invoiced, its description becomes part of that line item's text on the actual
        invoice PDF the client sees (alongside the task group/task name, or the charge code for
        non-project entries). Write it with the client as the reader.
      </p>
    </>
  ),
};

export const ccaScheduleHelp = {
  title: 'How CCA Works',
  content: (
    <>
      <p>
        <strong>UCC (Undepreciated Capital Cost)</strong> is what's left of an asset's value to
        depreciate. <strong>UCC Opening</strong> is that balance at the start of the tax year you're
        viewing; <strong>Additions</strong>/<strong>Disposals</strong> adjust it for costs added to
        or amounts removed from the asset during that year.
      </p>
      <p>
        In an asset's <strong>year of purchase</strong>, the CRA only allows half the normal rate —
        this app applies that half-year rule for you automatically.
      </p>
      <p>
        <strong>Important:</strong> UCC Opening, Additions, and Disposals are single values stored
        per asset — switching the Tax Year dropdown recalculates the deduction using whatever is
        currently saved, it does <strong>not</strong> automatically roll the balance forward from a
        prior year. Before working in a new tax year, update each asset's UCC Opening yourself to
        last year's closing balance (last year's UCC Opening + Additions − Disposals − last year's
        CCA deduction).
      </p>
    </>
  ),
};

export const homeOfficeHelp = {
  title: 'Home Office Deduction',
  content: (
    <>
      <p>
        The CRA lets you determine your business-use percentage either by{' '}
        <strong>room count</strong> (office rooms ÷ total rooms) or{' '}
        <strong>square footage</strong> (office sq ft ÷ total sq ft) — pick whichever method you
        actually use for your own records.
      </p>
      <p>
        The deduction is: monthly home costs × 12 × your business-use percentage. For{' '}
        <strong>Rent / Mortgage interest</strong>, only enter the <strong>interest</strong> portion
        of a mortgage payment — mortgage principal repayment isn't deductible.
      </p>
      <p>
        Not enforced by this app: the CRA doesn't let a home office deduction create or increase a
        business loss (it can only reduce net income to zero), and any unused portion carries
        forward to next year. This app doesn't track that carry-forward — keep your own note if it
        applies to you.
      </p>
    </>
  ),
};

export const t2125ReportHelp = {
  title: 'About This Report',
  content: (
    <>
      <p>
        This is a <strong>read-only summary</strong> mirroring the CRA's T2125 form and its line
        numbers, assembled automatically from your Invoices, Expenses, CCA Schedule, and Home
        Office settings for the selected year. It's a reference to help you fill out your actual
        return, not a filing itself.
      </p>
      <p>
        <strong>Heads up:</strong> "Meals &amp; Entertainment (50%)" is labeled that way because the
        CRA only lets you deduct half of those costs — but this report shows the{' '}
        <strong>full amount</strong> you logged as an expense, not the halved figure. Reduce that
        category by half yourself before using it on your actual return.
      </p>
      <p>
        HST collected is subtracted from gross revenue because it was never your income — it was
        always the CRA's money, just collected through you.
      </p>
    </>
  ),
};

export const taskGroupsHelp = {
  title: 'How Task Groups Work',
  content: (
    <>
      <p>
        A project's work is organized into <strong>groups</strong> (e.g. "Design", "Backend"),
        each holding a list of <strong>tasks</strong>. Drag the ⠿ handle to reorder tasks or
        groups, use the ▲▼ arrows to move a whole group, and "Merge" to fold a group into the
        one above it — these actions can't be undone.
      </p>
      <p>
        <strong>Estimate</strong> (the "+ est." chip) is a number you set by hand — it's a
        plan, not a measurement. <strong>Actual</strong> only appears once time has actually
        been logged against that task (via the timer or a timesheet entry), and is computed
        automatically — you can't edit it directly.
      </p>
      <p>
        The small circular button next to a task's title ("Select for timer") is what links
        that task to the timer on the Timer page, so time you track gets attributed to it.
      </p>
      <p>
        "Import tasks from Statement of Work" (SOW Import) uses AI to read an uploaded
        document and automatically creates a full set of groups and tasks from it — review
        what it creates, since it's a starting point, not always exact.
      </p>
    </>
  ),
};
