const CONTRIBUTORS: { name: string; photo: string; bio: React.ReactNode }[] = [
  {
    name: 'Keith Richotte, Jr.',
    photo: 'KeithRichotte.jpeg',
    bio: (
      <>
        <strong className="font-semibold text-ink">Keith Richotte, Jr.</strong> is a citizen of the Turtle
        Mountain Band of Chippewa Indians and the Director of the Indigenous Peoples Law and Policy Program
        and Professor at the University of Arizona James E. Rogers College of Law. Richotte has served his
        tribal nation as an Associate Justice on the Turtle Mountain Tribal Court of Appeals since 2009 and
        also serves as the Chief Justice of the Spirit Lake Tribal Court of Appeals. His scholarship focuses
        on federal Indian law, tribal law, tribal constitutionalism, and the relationship between tribal
        nations and the U.S. Constitution. He received his J.D. from the University of Minnesota Law School,
        his LL.M. from the IPLP Program he now directs, and his Ph.D. in American Studies from the University
        of Minnesota.
      </>
    ),
  },
  {
    name: 'Zoë Wise',
    photo: 'ZoeWise.jpeg',
    bio: (
      <>
        <strong className="font-semibold text-ink">Zoë Wise</strong> (Muscogee (Creek) Nation) graduated from
        the University of Arizona James E. Rogers College of Law in 2025 where she received a certificate in
        Indigenous Peoples Law and Policy. After law school she clerked for Chief Justice Carney of the
        Alaska Supreme Court. While at the College of Law she served as Editor in Chief of the Arizona
        Journal of Environmental Law and Policy, as a Law Clerk for the Tohono O'odham Judicial Branch, and
        as a Research Assistant working on the Supreme Court Indian Law Database. Before law school Zoë was a
        paralegal and an Adjunct Professor of English at the University of Alaska Fairbanks. Zoë earned her
        MFA in Creative Writing from the University of Alaska Fairbanks and her BA in English from Western
        Washington University.
      </>
    ),
  },
  {
    name: 'Cas Laskowski',
    photo: 'CasLaskowski.jpg',
    bio: (
      <>
        <strong className="font-semibold text-ink">Cas Laskowski</strong> is a veteran, librarian, gamer,
        teacher, Latina, techie, comic book nerd, and empiricist in perpetual beta. She regularly engages in
        national AI efforts, including co-founding the Future of Law Libraries Initiative. She was a '24–'25
        fellow of the UA Research Leadership Institute, a founding fellow of the University of Tennessee
        Library's 2021 IDEA Institute on Artificial Intelligence, and the only librarian of any type to be
        selected for the 2022 Summer Conference on Applied Data Science at North Carolina State University,
        where she leveraged machine learning summarization methods to design a prototype system that would
        aid intelligence analysts in efficiently identifying relevant audio files. She co-led the UA Making
        AI Generative for Higher Education project team, a two-year cross-institution partnership with Ithaka
        S+R. She currently serves on the Arizona Steering Committee on Artificial Intelligence and the Courts
        and UA's AI Roadmap initiative.
      </>
    ),
  },
  {
    name: 'Jon Marthaler',
    photo: 'JonMarthaler.jpeg',
    bio: (
      <>
        <strong className="font-semibold text-ink">Jon Marthaler</strong> is a graduate of the University of
        Arizona Eller College of Management, with a master's degree in management information systems. He did
        much of the work to turn this project from a data set into a website.
      </>
    ),
  },
]

export default function Contributors() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Contributors</h1>
      </header>
      <div className="flex flex-col gap-8">
        {CONTRIBUTORS.map((person) => (
          <section key={person.name} className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <img
              src={`${import.meta.env.BASE_URL}assets/contributors/${person.photo}`}
              alt={`Portrait of ${person.name}`}
              width={144}
              height={144}
              loading="lazy"
              // If the photo hasn't been added to public/assets/contributors yet,
              // hide the broken-image placeholder and let the text stand alone.
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className="h-36 w-36 shrink-0 rounded-lg border border-hairline object-cover"
            />
            <p className="text-[15px] leading-relaxed text-ink2">{person.bio}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
