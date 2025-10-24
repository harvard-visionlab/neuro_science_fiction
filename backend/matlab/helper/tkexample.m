
% try it out
clear all
close all
clc



% load participant 1's data
load('../Code/data-science-P1.mat')
whos


%% poke around at the data
% 12 categories (conds)
% 60 items      (words)
% 6 repetitions (epochs)

categList = unique({info.cond}');
itemList = unique({info.word}');
epoch = [1:6];


%% pick a trial (of 360)
% find(strcmp({info.word}, 'refridgerator'))
% 1   114   137   186   252   322

% show info
trial = 322;
info(trial)

% get the brain data
brainVector = data{trial};
brainCube = zeros(size(meta.coordToCol));
brainCube(find(meta.coordToCol)) = brainVector;

%view it
quickViewCube(meta.coordToCol)
quickViewCube(brainCube)



% ----------------------------------------------------------------------

% ok what are the things I want to see with this data set?

%% first verify and sanity check

% 1- where are the most active voxels for ANIMALS, BUILDINGS (should give
% ffa/ppa, and lateral surface)
% 2- show the DIFFERENCE in activation between ANIMALS and BUILDINGS (should
% also give ffa/ppa?)

% ?- maybe also make a visualization that does the LSPA over object
% areas... to also visualize this?
% ?- maybe also pick the cortex to use for matching with KOHONEN MAPPING!
% just passed earlyV!


%% next, learn where new categories are:

% 1- where are CLOTHING compared to BODY PART
% 2- where are peak VEGETABLE voxels compared to TOOL
% 3- size predictions: (big) FURNITURE + VEHICLE + BUILDING
%  - size predictions: (small) tool, vegetable, buildpart?
% 4- look up animacy differences: INSECT vs ANIMAL vs BODY PART
% 5- compare BODY PART and TOOL for overlap/distribution






























































