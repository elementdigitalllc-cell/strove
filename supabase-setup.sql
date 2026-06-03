create table profiles (id uuid references auth.users primary key, username text unique, full_name text, bio text, goal text, streak_count int default 0, joined_at timestamp default now());
create table posts (id uuid default gen_random_uuid() primary key, user_id uuid references profiles(id), content text, created_at timestamp default now(), likes int default 0, reposts int default 0, views int default 0);
create table follows (follower_id uuid references profiles(id), following_id uuid references profiles(id), primary key (follower_id, following_id));
create table journal_notes (id uuid default gen_random_uuid() primary key, user_id uuid references profiles(id), content text, created_at timestamp default now());
create table pot_entries (id uuid default gen_random_uuid() primary key, user_id uuid references profiles(id), why_i_should_win text, month int, year int, created_at timestamp default now());
create table votes (id uuid default gen_random_uuid() primary key, voter_id uuid references profiles(id), candidate_id uuid references profiles(id), month int, year int);
