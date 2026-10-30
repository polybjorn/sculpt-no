# sculpt.no

A proposed new website for Sculpt, Ester Svindland's studio in Flekkefjord,
Norway, which makes pregnancy sculptures and other personal sculptures of real
people, 3D scanned and finished by hand. The current site is
[sculpt.no](https://www.sculpt.no). This one runs as a preview at
[polybjorn.github.io/sculpt-no](https://polybjorn.github.io/sculpt-no/).

## How it works

Built with [Astro](https://astro.build) as static HTML and plain CSS. The only
script opens the menu on phones, and without it the menu is simply listed in
full.

The text is Ester's own, carried over word for word from the current site, and
every page keeps its old address, so existing links and search results still
land. Each change to the text, down to a typo, is listed with before and after
in [`docs/text-changes.yaml`](docs/text-changes.yaml) for her to approve, and a
test compares every built page with the original so nothing changes without
being listed.

Fonts and photos are served from the site itself, so a visit loads nothing from
any other domain.

## License

MIT for the code. The page texts and photos belong to Ester Svindland and are
not covered by it.
