{
  # 自分用の開発用Shell。エディタの補完とかlintようにツールを揃える
  # 開発はすべてDockerコンテナ内で完結するようにする。
  description = "hackathon dev shell (personal, not required for the team)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system:
        f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            go
            air
            sqlc
            nodejs_22
            postgresql # psql クライアント
          ];
        };
      });
    };
}
