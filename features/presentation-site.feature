Feature: Present the Magrathea OSS software constellation
  The organization needs one coherent public entry point
  so visitors can understand the suite without inflated maturity claims.

  Scenario: Introduce the constellation with a distinctive Magrathea identity
    Given a visitor opens the presentation site
    Then the hero says "Software made to measure"
    And the original Magrathea orbit mark is visible
    And the visual language recalls the Magrathea Git forge shell

  Scenario Outline: Describe each first product world
    Given a visitor reaches the product constellation
    Then a product card names "<product>"
    And it explains the "<boundary>" boundary
    And it exposes an honest maturity label

    Examples:
      | product                  | boundary |
      | Magrathea Git            | code     |
      | Magrathea PKI            | trust    |
      | Magrathea ObjectStore    | data     |

  Scenario: Preserve truthful status boundaries
    Given the projects have different maturity levels
    Then the site identifies repositories and executable requirements as authoritative
    And it does not imply production readiness, certification, or compliance assurance

  Scenario: Remain accessible across presentation modes
    Given a visitor uses a desktop, mobile, keyboard, reduced-motion, or JavaScript-free browser
    Then the primary message and all product descriptions remain reachable
    And the document has no horizontal overflow
