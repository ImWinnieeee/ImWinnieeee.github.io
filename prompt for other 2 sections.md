I am considering eventually turning the emoji row above:

Winnie's Food Map

into three top-level tabs:

Winnie's Food Map
Work & Education
Activities

The reason is that this website will be linked in my MBA applications.

The current Food Map shows one dimension of my interests and impact, but I may later want the same website to also contain:

professional achievements
work projects
education
university projects
extracurricular activities
volunteering / social-impact initiatives

The Work & Education and Activities sections would have completely different content and I will provide separate briefs and source folders later.

Important architecture requirement: these must remain part of the SAME website

If I build these sections later, I do NOT want them to become:

separate websites
separate deployments
separate domains or subdomains
separate standalone projects
links that send the visitor away from the current website

They should all belong to the same website / same deployed application.

From the user's perspective, the final experience should feel like one portfolio website with three top-level sections.

When the user clicks a tab such as:

Winnie's Food Map | Work & Education | Activities

the website should switch directly to the selected section while remaining within the same site.

The exact implementation can follow whatever routing/component structure best fits the current codebase, but the user experience should feel like seamless tab/page switching inside one website.

For example, internal routes such as:

/food-map
/work
/activities

would be acceptable only if they are routes within this same website/application.

They should NOT point to separately hosted sites.

Final intended navigation concept

If I eventually decide to launch all three sections, I want a top-level navigation conceptually like:

Winnie's Food Map | Work & Education | Activities

Clicking each one would display the corresponding content within the same website.

For example:

Winnie's Food Map

The current page and all existing Google Maps-related content.

Work & Education

Future content related to:

professional experience
work achievements
projects
education
university work
Activities

Future content related to:

extracurricular activities
volunteering
social-impact initiatives
personal projects

These pages may have very different internal layouts, but they should still feel like three sections of the same overall portfolio website.