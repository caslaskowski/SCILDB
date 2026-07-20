export default function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">About</h1>
      </header>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-ink2">
        <p>
          The Supreme Court Indian Law Database was created by Keith Richotte, Jr., the Director of the
          Indigenous Peoples Law and Policy Program and a Professor of Law at the University of Arizona.
        </p>
        <p>
          Richotte is the Director of the Indigenous Peoples Law and Policy Program and Professor of Law at
          the James E. Rogers College of Law. Professor Richotte has served his tribal nation, the Turtle
          Mountain Band of Chippewa Indians, as an Associate Justice on the appellate court since 2009 and
          also serves as the Chief Justice of the appellate court of the Spirit Lake Nation. He received his
          J.D. from the Minnesota Law School, his Ph.D. from the University of Minnesota, and his LL.M. from
          the IPLP Program.
        </p>
        <p>
          Questions, corrections, or suggestions are welcome:{' '}
          <a href="mailto:richotte@arizona.edu" className="text-accent hover:underline">
            richotte@arizona.edu
          </a>
          .
        </p>
      </div>
    </div>
  )
}
