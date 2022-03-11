{
  description = "Cypress dependencies";

  outputs = { self, nixpkgs }: {
    devShell.x86_64-linux = let
      pkgs = import nixpkgs { system = "x86_64-linux"; };
    in pkgs.mkShell {
      buildInputs = with pkgs; [cypress];
    };
  };
}
