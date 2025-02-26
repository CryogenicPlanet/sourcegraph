#!/usr/bin/env sh
# This script runs several git commands with the goal to optimize the
# performance of git for large repositories.
#
# Relation to git gc and git maintenance:
#
# git-gc
# ------
# The order of commands in this script is based on the order in which git gc
# calls the same commands. The following is a list of commands based on running
# "GIT_TRACE2=1 git gc".
#
# git pack-refs --all --prune
# git reflog expire --all
# git repack -d -l -A --unpack-unreachable=2.weeks.ago
# git prune --expire 2.weeks.ago
# git worktree prune --expire 3.months.ago
# git rerere gc
# commit-graph (not traced)
#
# We deviate from git gc like follows:
# - For "git repack" and "git commit-graph write" we choose a different set of
# flags.
# - We ommit the commands "git rerere" and "git worktree prune" because they
# don't apply to our use-case.
#
# git-maintenance
# ---------------
# As of git 2.34.1, it is not possible to sufficiently fine-tune the tasks git
# maintenance runs. The tasks are configurable with git config, but not all
# flags are exposed as config parameters. For example, the task
# "incremental-repack" does not allow setting --geometric=2. If future releases
# of git allow us to set more parameters for "git maintenance", we should
# consider switching from this script to "git maintenance".

set -xe

# Usually run by git gc. Pack heads and tags for efficient repository access.
# --all Pack branch tips as well. Useful for a repository with many branches of
# historical interest.
git pack-refs --all --prune

# Usually run by git gc. The "expire" subcommand prunes older reflog entries.
# Entries older than expire time, or entries older than expire-unreachable time
# and not reachable from the current tip, are removed from the reflog.
# --all Process the reflogs of all references
git reflog expire --all

# With multi-pack-index and geometric packing, repacking should take time
# proportional to the number of new objects. Inspired by
# https://github.blog/2021-04-29-scaling-monorepo-maintenance/
# --write-midx reqiures git>=2.34.1.
git repack --write-midx --write-bitmap-index -d --geometric=2

# Usually run by git gc. Prune all unreachable objects form the object database.
git prune --expire 2.weeks.ago

# With the --changed-paths option, compute and write information about the
# paths changed between a commit and its first parent. This operation can take
# a while on large repositories. It provides significant performance gains for
# getting history of a directory or a file with git log -- <path>. If this
# option is given, future commit-graph writes will automatically assume that
# this option was intended
git commit-graph write --reachable --changed-paths
